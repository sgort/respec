#!/usr/bin/env node
// @ts-check
/* eslint-env node */
"use strict";
const port = 5000;
const colors = require("colors");
const { exec } = require("child_process");

const handler = require("serve-handler");
const http = require("http");

const nullDevice = process.platform === "win32" ? "\\\\.\\NUL" : "/dev/null";

function toExecutable(cmd) {
  return {
    get cmd() {
      return cmd;
    },
    run() {
      return new Promise((resolve, reject) => {
        const childProcess = exec(cmd, (err, data) => {
          if (err) {
            return reject(err);
          }
          resolve(data);
        });
        childProcess.stdout.pipe(process.stdout);
        childProcess.stderr.pipe(process.stderr);
      });
    },
  };
}

function toCommand(url, { useLocal = false } = {}) {
  const useLocalFlag = useLocal ? " --use-local" : "";
  return `node ./tools/respec2html.js -e${useLocalFlag} --timeout 30 --src ${url} --out ${nullDevice}`;
}

const commands = [
  toCommand(`http://localhost:${port}/examples/basic.built.html`),
  toCommand(`http://localhost:${port}/examples/basic.html`),
  toCommand(`http://localhost:${port}/examples/basic.built.html`, {
    useLocal: true,
  }),
];
const executables = commands.map(toExecutable);

async function runRespec2html() {
  const server = http.createServer(handler);
  server.listen(port);

  const errors = new Set();

  for (const [i, exe] of executables.entries()) {
    try {
      const testInfo = colors.green(`(test ${i + 1}/${executables.length})`);
      const msg = ` 👷‍♀️  ${exe.cmd} ${testInfo}`;
      debug(msg);
      await exe.run();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(colors.red(err));
      errors.add(exe.cmd);
    }
  }
  if (errors.size) {
    const files = [...errors].join(", ");
    throw new Error(` ❌ File(s) generated errors: ${files}.`);
  }
}

function debug(msg) {
  const currentTime = new Date().toLocaleTimeString("en-US");
  // eslint-disable-next-line no-console
  console.log(`${colors.grey(currentTime)} ${colors.cyan(msg)}`);
}

async function run() {
  debug(" ⏲  Running ReSpec2html tests...");
  try {
    await runRespec2html();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  }
  process.exit(0);
}

run();
