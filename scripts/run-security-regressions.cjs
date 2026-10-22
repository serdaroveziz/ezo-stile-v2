const {spawnSync}=require('node:child_process');const path=require('node:path');
const files=[
  "test_v2_syntax.cjs",
  "test_v2_rules_security_local.cjs",
  "test_v2_security_local.cjs",
  "test_v2_auth_tenant_isolation_local.cjs",
  "test_v2_boot_routing_local.cjs",
  "test_v2_review_flow_local.cjs",
  "test_v2_review_api_contract_local.cjs",
  "test_v2_customer_booking_experience_local.cjs",
  "test_v2_owner_booking_revenue_ux_local.cjs",
  "test_v2_staff_operations_local.cjs",
  "test_v2_staff_data_integrity_local.cjs",
  "test_v2_staff_panel_local.cjs",
  "test_v2_staff_role_routing_local.cjs",
  "test_v2_push_notifications_local.cjs",
  "test_v2_language_regression_local.cjs",
  "test_v2_persian_i18n_local.cjs",
  "test_v2_i18n_full_local.cjs",
  "test_v2_public_discovery_local.cjs",
  "test_v2_public_storefront_local.cjs",
  "test_v2_staff_projection_local.cjs"
];
let failed=0;
for(const file of files){const r=spawnSync(process.execPath,['--require',path.join(__dirname,'security-offline-guard.cjs'),file],{encoding:'utf8',timeout:40000});console.log((r.status===0?'PASS ':'FAIL ')+file);if(r.status!==0){failed++;console.error(r.stdout,r.stderr,r.error||'');}}
console.log(files.length-failed+'/'+files.length+' regression suites passed');process.exitCode=failed?1:0;
