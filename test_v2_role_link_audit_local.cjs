const assert=require('assert');
(async()=>{const {auditUserRoleLinks}=await import('./scripts/audit-user-role-links.mjs');const result=auditUserRoleLinks({
 users:{badOwner:{role:'owner',businessId:'b1',phone:'+905551112233'},customerOwner:{role:'customer',phone:'0555 111 22 33'},orphan:{role:'customer',businessId:'missing'},staffMismatch:{role:'barber',businessId:'b1'}},
 businesses:{b1:{ownerUid:'realOwner',staff:{}},b2:{ownerUid:'customerOwner',staff:{s1:{userId:'customerOwner',role:'manager',active:true}}},b3:{ownerUid:'other'}},
 salon_applications:{ok:{status:'approved',businessId:'b2',applicantUid:'customerOwner'},bad:{status:'approved',businessId:'b3',applicantUid:'wrong'},missing:{status:'approved',businessId:'gone',applicantUid:'nobody'}}
});
const types=result.findings.map(item=>item.type);
for(const expected of ['OWNER_PROFILE_MISMATCH','CUSTOMER_IS_BUSINESS_OWNER','OWNER_STAFF_CONFLICT','ORPHAN_BUSINESS_ID','STAFF_PROFILE_MISMATCH','DUPLICATE_USER_PHONE_IDENTITY','APPLICATION_OWNER_MISMATCH','APPROVED_APPLICATION_MISSING_BUSINESS'])assert.ok(types.includes(expected),expected);
assert.equal(result.dryRun,true);assert.equal(result.findingCount,8);assert.equal(result.applicationCount,3);console.log('ROLE LINK AUDIT LOCAL: 11/11 kontrol geçti');
})().catch(e=>{console.error(e);process.exit(1)});
