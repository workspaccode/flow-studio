import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';

test('Desktop files exist and have correct configuration', () => {
  assert.ok(existsSync('desktop/main.cjs'), 'desktop/main.cjs must exist');
  assert.ok(existsSync('desktop/preload.cjs'), 'desktop/preload.cjs must exist');
  assert.ok(existsSync('run-desktop.sh'), 'run-desktop.sh must exist');
  assert.ok(existsSync('Flow-Studio.command'), 'Flow-Studio.command must exist');

  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  assert.equal(pkg.main, 'desktop/main.cjs');
  assert.ok(pkg.scripts.desktop.includes('electron'));
  assert.ok(pkg.scripts['desktop:dev'].includes('electron'));
});

test('server.py contains desktop mode integration', () => {
  const serverPy = readFileSync('server.py', 'utf8');
  assert.ok(serverPy.includes('--desktop'), 'server.py must handle --desktop flag');
  assert.ok(serverPy.includes('launch_desktop'), 'server.py must have launch_desktop function');
});

test('web/styles.css enforces borderless and zero linear gradients', () => {
  const css = readFileSync('web/styles.css', 'utf8');
  assert.ok(!css.includes('linear-gradient'), 'styles.css must not use linear gradients');
  assert.ok(css.includes('--shadow-card'), 'styles.css must use shadow tokens');
  assert.ok(css.includes('--shadow-btn'), 'styles.css must use button shadow tokens');
  assert.ok(css.includes('border: none'), 'styles.css must use border: none');
});

test('Domain section contains isometric energy tools with zero linear gradients', () => {
  const coreJs = readFileSync('src/core.js', 'utf8');
  // Zero SVG linear gradients
  assert.ok(!coreJs.includes('<linearGradient'), 'core.js SVGs must have zero linearGradient elements');
  
  // Isometric assets present
  const requiredAssets = [
    'solar-array',
    'powerhouse-iso',
    'inverter-wall',
    'battery-rack',
    'bess-iso',
    'grid-tower-iso',
    'platform-iso',
    'conduit-junction',
    'scene-badge'
  ];
  for (const asset of requiredAssets) {
    assert.ok(coreJs.includes(`'${asset}':svgAsset`) || coreJs.includes(`'${asset}':`), `core.js must define ${asset}`);
  }

  // Domain preset contains all 6 telemetry cards matching user reference
  assert.ok(coreJs.includes('PV ARRAY • 28.8 kWp'), 'Must contain PV Array telemetry card');
  assert.ok(coreJs.includes('2 × S6 HYBRID INVERTER'), 'Must contain Hybrid Inverter telemetry card');
  assert.ok(coreJs.includes('2 × DYNESS HV'), 'Must contain Dyness HV Battery telemetry card');
  assert.ok(coreJs.includes('HOME • DIRECT'), 'Must contain Home Direct telemetry card');
  assert.ok(coreJs.includes('BACKUP LOAD'), 'Must contain Backup Load telemetry card');
  assert.ok(coreJs.includes('METER → SEC GRID'), 'Must contain Grid Meter telemetry card');

  // Lottie export has leader line shape generation
  assert.ok(coreJs.includes('• leader'), 'Lottie export must generate leader line vector shape layers');
});

