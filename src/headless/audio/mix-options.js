export const MIX_CONDITIONS = Object.freeze({t3_identity:true,s3gen_identity:true,t3_prompt:false,s3gen_prompt:false,s3gen_flow:true})
export function mixConditions(ui) {
  return Object.fromEntries(Object.entries(MIX_CONDITIONS).map(([key,fallback])=>[key,ui[`chatterbox-mix-${key.replaceAll('_','-')}`]??fallback]))
}
