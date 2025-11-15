#!/usr/bin/env node
/**
 * Run vite dev with dual output: console (with colors) + log file (without colors)
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI regex to strip color codes and control characters
const ansiRegex = /\x1b\[[0-9;]*m/g;

// Function to clean terminal output for log files
function cleanTerminalOutput(text) {
  // Strip ANSI color codes
  let cleaned = text.replace(ansiRegex, '');

  // Handle carriage returns - keep only the final line after \r
  cleaned = cleaned.split('\r').pop();

  // Remove other terminal control sequences
  cleaned = cleaned.replace(/\x1b\[[\d;]*[A-Za-z]/g, '');

  return cleaned;
}

// Clear log file
const logPath = path.resolve(process.cwd(), 'dev.log');
fs.writeFileSync(logPath, '');

// Spawn vite dev with color support forced
const vite = spawn('vite', ['dev'], {
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: true,
  env: {
    ...process.env,
    FORCE_COLOR: '1'  // Force color output even when piped
  }
});

// Handle stdout
vite.stdout.on('data', (data) => {
  const text = data.toString();

  // Write to console with colors
  process.stdout.write(text);

  // Write to file without colors and control characters
  const cleanText = cleanTerminalOutput(text);
  if (cleanText.trim()) {
    fs.appendFileSync(logPath, cleanText);
  }
});

// Handle stderr
vite.stderr.on('data', (data) => {
  const text = data.toString();

  // Write to console with colors
  process.stderr.write(text);

  // Write to file without colors and control characters
  const cleanText = cleanTerminalOutput(text);
  if (cleanText.trim()) {
    fs.appendFileSync(logPath, cleanText);
  }
});

// Handle exit
vite.on('close', (code) => {
  process.exit(code);
});

// Forward signals
process.on('SIGINT', () => vite.kill('SIGINT'));
process.on('SIGTERM', () => vite.kill('SIGTERM'));
