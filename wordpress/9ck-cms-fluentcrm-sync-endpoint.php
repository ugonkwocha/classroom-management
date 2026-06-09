<?php
/**
 * 9jacodekids CMS FluentCRM sync endpoint.
 *
 * Install as a small plugin or paste into Code Snippets on the WordPress site.
 * Define NCK_CMS_SYNC_SECRET in wp-config.php with the same value as the CMS
 * FLUENTCRM_SYNC_SECRET environment variable.
 */

if (!defined('ABSPATH')) {
    exit;
}

add_action('rest_api_init', function () {
    register_rest_route('9ck/v1', '/fluentcrm/sync-paid-customer', [
        'methods'             => 'POST',
        'callback'            => 'nck_cms_sync_paid_customer_to_fluentcrm',
        'permission_callback' => 'nck_cms_can_sync_paid_customer',
    ]);
});

function nck_cms_can_sync_paid_customer(WP_REST_Request $request) {
    $expectedSecret = defined('NCK_CMS_SYNC_SECRET') ? constant('NCK_CMS_SYNC_SECRET') : '';

    if (!$expectedSecret) {
        return new WP_Error(
            'missing_sync_secret',
            'NCK_CMS_SYNC_SECRET is not configured on WordPress.',
            ['status' => 500]
        );
    }

    $authorization = $request->get_header('authorization');
    $providedSecret = '';

    if ($authorization && preg_match('/Bearer\s+(.+)/i', $authorization, $matches)) {
        $providedSecret = trim($matches[1]);
    }

    if (!$providedSecret || !hash_equals($expectedSecret, $providedSecret)) {
        return new WP_Error(
            'forbidden',
            'Invalid CMS sync secret.',
            ['status' => 403]
        );
    }

    return true;
}

function nck_cms_sync_paid_customer_to_fluentcrm(WP_REST_Request $request) {
    if (!function_exists('FluentCrmApi')) {
        return new WP_Error(
            'fluentcrm_missing',
            'FluentCRM is not active or FluentCrmApi() is unavailable.',
            ['status' => 500]
        );
    }

    $payload = $request->get_json_params();
    if (!is_array($payload)) {
        $payload = [];
    }

    $contactPayload = isset($payload['contact']) && is_array($payload['contact'])
        ? $payload['contact']
        : [];

    $email = sanitize_email(nck_cms_first_value([
        $contactPayload['email'] ?? null,
        $payload['email'] ?? null,
    ]));

    if (!$email) {
        return new WP_Error(
            'missing_email',
            'A parent email is required to sync a FluentCRM contact.',
            ['status' => 400]
        );
    }

    $firstName = sanitize_text_field(nck_cms_first_value([
        $contactPayload['firstName'] ?? null,
        $contactPayload['first_name'] ?? null,
        $payload['firstName'] ?? null,
        $payload['first_name'] ?? null,
    ]));

    $lastName = sanitize_text_field(nck_cms_first_value([
        $contactPayload['lastName'] ?? null,
        $contactPayload['last_name'] ?? null,
        $payload['lastName'] ?? null,
        $payload['last_name'] ?? null,
    ]));

    $phone = sanitize_text_field(nck_cms_first_value([
        $contactPayload['phone'] ?? null,
        $payload['phone'] ?? null,
    ]));

    $paidTags = nck_cms_normalize_tag_values([
        $payload['paidTag'] ?? null,
        $payload['paidTags'] ?? null,
        $payload['tag'] ?? null,
        $payload['tags'] ?? null,
        $payload['addTags'] ?? null,
        $payload['addTagIds'] ?? null,
        $payload['addTagNames'] ?? null,
        $payload['addTagSlugs'] ?? null,
    ]);

    if (!$paidTags) {
        return new WP_Error(
            'missing_paid_tags',
            'No paid FluentCRM tag was provided by the CMS.',
            ['status' => 400]
        );
    }

    $removeTags = nck_cms_normalize_tag_values([
        $payload['removeTag'] ?? null,
        $payload['removeTags'] ?? null,
    ]);

    try {
        $contactApi = FluentCrmApi('contacts');
        $subscriber = $contactApi->createOrUpdate([
            'email'      => $email,
            'first_name' => $firstName,
            'last_name'  => $lastName,
            'phone'      => $phone,
            'status'     => 'subscribed',
        ]);

        if (!$subscriber || empty($subscriber->id)) {
            return new WP_Error(
                'subscriber_sync_failed',
                'FluentCRM did not return a valid subscriber.',
                ['status' => 500]
            );
        }

        nck_cms_ensure_tags_exist($paidTags);
        $subscriber->attachTags($paidTags);

        if ($removeTags) {
            $subscriber->detachTags($removeTags);
        }

        return rest_ensure_response([
            'ok'          => true,
            'contactId'   => (string) $subscriber->id,
            'email'       => $email,
            'appliedTags' => $paidTags,
            'removedTags' => $removeTags,
            'message'     => sprintf('Applied %d paid tag(s) in FluentCRM.', count($paidTags)),
        ]);
    } catch (Throwable $error) {
        return new WP_Error(
            'fluentcrm_sync_failed',
            $error->getMessage(),
            ['status' => 500]
        );
    }
}

function nck_cms_first_value(array $values) {
    foreach ($values as $value) {
        if (is_string($value) && trim($value) !== '') {
            return trim($value);
        }

        if (is_numeric($value)) {
            return (string) $value;
        }
    }

    return '';
}

function nck_cms_normalize_tag_values(array $values) {
    $tags = [];

    foreach ($values as $value) {
        if ($value === null || $value === false || $value === '') {
            continue;
        }

        if (is_array($value)) {
            foreach ($value as $item) {
                $tags = array_merge($tags, nck_cms_normalize_tag_values([$item]));
            }
            continue;
        }

        $parts = preg_split('/\s*,\s*/', (string) $value);
        foreach ($parts as $part) {
            $part = trim($part);
            if ($part !== '') {
                $tags[] = ctype_digit($part) ? (int) $part : sanitize_text_field($part);
            }
        }
    }

    $unique = [];
    foreach ($tags as $tag) {
        $key = is_int($tag) ? 'id:' . $tag : 'text:' . strtolower($tag);
        $unique[$key] = $tag;
    }

    return array_values($unique);
}

function nck_cms_ensure_tags_exist(array $tags) {
    $tagPayload = [];

    foreach ($tags as $tag) {
        if (is_int($tag)) {
            continue;
        }

        $tagPayload[] = [
            'title' => $tag,
            'slug'  => sanitize_title($tag),
        ];
    }

    if (!$tagPayload) {
        return;
    }

    FluentCrmApi('tags')->importBulk($tagPayload);
}
