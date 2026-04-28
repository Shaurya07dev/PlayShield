import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';

export async function POST(request: Request) {
  try {
    // Determine the path to the scanner directory
    // Assuming the Next.js app is at /Users/.../dashboard
    const scannerPath = path.resolve(process.cwd(), '../scanner');
    
    console.log(`Executing scanner at: ${scannerPath}`);
    
    return new Promise((resolve) => {
      exec('node scan.js --demo', { cwd: scannerPath }, (error, stdout, stderr) => {
        if (error) {
          console.error(`Scanner execution error: ${error}`);
          return resolve(NextResponse.json({ success: false, error: error.message }, { status: 500 }));
        }
        
        console.log(`Scanner stdout: ${stdout}`);
        resolve(NextResponse.json({ success: true, output: stdout }));
      });
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
