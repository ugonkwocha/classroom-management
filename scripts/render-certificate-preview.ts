import { writeFile } from 'fs/promises';
import { generateCertificatePdf } from '../lib/certificate-pdf';

async function main() {
  const outputPath = process.argv[2] || '/tmp/9jacodekids-certificate-preview.pdf';
  const pdf = await generateCertificatePdf({
    studentName: 'Alexandria-Chimamanda Okonkwo-Nwachukwu',
    courseTitle: 'Scratch Junior 101: Introduction to Block-Based Programming and Creative Computing',
    achievementWording: 'and demonstrating an understanding of the basic concepts of Computer Science, creative problem-solving, and digital project development.',
    completionDate: new Date('2026-08-28T12:00:00.000Z'),
    signatoryName: 'Ugochukwu Nkwocha',
    signatoryTitle: 'Founder/CEO',
    certificateNumber: '9CK-2026-A1B2C3D4',
    verificationUrl: 'https://cms.9jacodekids.com/verify/certificate/sample',
    preview: true,
  });

  await writeFile(outputPath, pdf);
  console.log(outputPath);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
