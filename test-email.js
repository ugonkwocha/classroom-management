#!/usr/bin/env node

/**
 * Test script to verify AWS SES credentials and email sending capability
 * Usage: node test-email.js
 */

require('dotenv').config();
const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const ses = new AWS.SES();

async function testEmailCredentials() {
  console.log('🔍 Testing AWS SES Configuration...\n');

  // Check environment variables
  console.log('Environment Variables:');
  console.log(`  ✓ AWS_ACCESS_KEY_ID: ${process.env.AWS_ACCESS_KEY_ID?.substring(0, 10)}...`);
  console.log(`  ✓ AWS_SECRET_ACCESS_KEY: ${process.env.AWS_SECRET_ACCESS_KEY?.substring(0, 10)}...`);
  console.log(`  ✓ AWS_REGION: ${process.env.AWS_REGION}`);
  console.log(`  ✓ AWS_SES_FROM_EMAIL: ${process.env.AWS_SES_FROM_EMAIL}\n`);

  try {
    // Test 1: Verify email address
    console.log('Test 1: Verifying SES Account Status...');
    const accountParams = {};
    const accountData = await ses.getSendQuota(accountParams).promise();

    console.log('✅ SES Account Status:');
    console.log(`  - Max 24-Hour Send: ${accountData.Max24HourSend}`);
    console.log(`  - Sent Last 24 Hours: ${accountData.SentLast24Hour}`);
    console.log(`  - Max Send Rate: ${accountData.MaxSendRate} emails/second\n`);

    // Test 2: List verified identities
    console.log('Test 2: Verified Email Addresses:');
    const identitiesData = await ses.listVerifiedEmailAddresses({}).promise();

    if (identitiesData.VerifiedEmailAddresses.length === 0) {
      console.log('⚠️  No verified email addresses found!');
      console.log('   Please verify ' + process.env.AWS_SES_FROM_EMAIL + ' in AWS SES console\n');
    } else {
      console.log('✅ Verified Addresses:');
      identitiesData.VerifiedEmailAddresses.forEach((email) => {
        console.log(`  - ${email}`);
      });
      console.log();
    }

    // Test 3: Send test email
    console.log('Test 3: Sending Test Email...');

    const params = {
      Source: process.env.AWS_SES_FROM_EMAIL,
      Destination: {
        ToAddresses: [process.env.AWS_SES_FROM_EMAIL], // Send to self for testing
      },
      Message: {
        Subject: {
          Data: 'Academy Enrollment - Email Test',
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: `
              <html>
                <body style="font-family: Arial, sans-serif; color: #333;">
                  <h1>Email System Test</h1>
                  <p>This is a test email from the Academy Enrollment system.</p>
                  <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
                  <p style="color: #666; margin-top: 20px; font-size: 12px;">
                    If you received this email, your AWS SES configuration is working correctly!
                  </p>
                </body>
              </html>
            `,
            Charset: 'UTF-8',
          },
        },
      },
    };

    const sendData = await ses.sendEmail(params).promise();

    console.log('✅ Email Sent Successfully!');
    console.log(`  - Message ID: ${sendData.MessageId}`);
    console.log(`  - Status: Check your email at ${process.env.AWS_SES_FROM_EMAIL}\n`);

    console.log('🎉 All tests passed! Your email system is ready to use.\n');
  } catch (error) {
    console.error('❌ Error testing SES:\n');
    console.error(`  Code: ${error.code}`);
    console.error(`  Message: ${error.message}\n`);

    if (error.code === 'MessageRejected') {
      console.log('⚠️  Possible causes:');
      console.log('  1. Email address not verified in AWS SES');
      console.log('  2. Account still in SES sandbox mode');
      console.log('  3. Recipient email not in verified list (for sandbox)\n');
    } else if (error.code === 'AuthFailure' || error.code === 'InvalidParameterValue') {
      console.log('⚠️  Possible causes:');
      console.log('  1. Invalid AWS credentials');
      console.log('  2. Incorrect AWS region');
      console.log('  3. IAM user does not have SES permissions\n');
    }

    console.log('📋 Next steps:');
    console.log('  1. Check your .env file has correct credentials');
    console.log('  2. Verify email address in AWS SES console');
    console.log('  3. Request production access if in sandbox mode');
    console.log('  4. Ensure IAM user has "ses:SendEmail" permission\n');

    process.exit(1);
  }
}

testEmailCredentials();
