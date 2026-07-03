const { withAndroidManifest } = require('@expo/config-plugins');

const ALARM_PERMISSIONS = [
  'android.permission.SCHEDULE_EXACT_ALARM',
  'android.permission.USE_EXACT_ALARM',
];

module.exports = function withRemoveAlarmPermission(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    if (!manifest.$['xmlns:tools']) {
      manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    if (!manifest['uses-permission']) {
      manifest['uses-permission'] = [];
    }

    // Strip any existing entries for these permissions
    manifest['uses-permission'] = manifest['uses-permission'].filter(
      (p) => !ALARM_PERMISSIONS.includes(p.$?.['android:name'])
    );

    // Add tools:node="remove" so Gradle merge strips them from library manifests too
    for (const perm of ALARM_PERMISSIONS) {
      manifest['uses-permission'].push({
        $: { 'android:name': perm, 'tools:node': 'remove' },
      });
    }

    return config;
  });
};
