const globals=Object.fromEntries(['window','document','localStorage','sessionStorage','location','history','navigator','crypto','FormData','Blob','URL','URLSearchParams','Intl','fetch','createImageBitmap','setTimeout','clearTimeout','console','process','Buffer'].map(name=>[name,'readonly']));
export default [
  {ignores:['node_modules/**','dist/vendor/**','dist/config.js']},
  {files:['**/*.js','**/*.mjs'],languageOptions:{ecmaVersion:'latest',sourceType:'module',globals},rules:{'no-undef':'error','no-unreachable':'error','no-dupe-keys':'error','no-constant-condition':['error',{checkLoops:false}]}}
];
