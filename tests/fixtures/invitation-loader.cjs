module.exports=function(source){
 if(this.resourcePath.endsWith('.css'))return 'const style=document.createElement("style");style.textContent='+JSON.stringify(source)+';document.head.append(style);';
 return require('typescript').transpileModule(source,{compilerOptions:{target:99,module:99,jsx:4}}).outputText;
};
