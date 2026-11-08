// Package the same source modules used by Next.js. No environment variables are read.
import ts from "typescript";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const modules=["strength","development/model","development/commands","development/catalog","development/merits","development/server"];
const files=[{name:"index.js",content:read("supabase/functions/club-development/index.js")}];
for(const name of modules){
 const {outputText}=ts.transpileModule(read("src/lib/"+name+".ts"),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022},
  transformers:{before:[ctx=>root=>ts.visitEachChild(root,node=>{
   if(ts.isImportDeclaration(node)&&ts.isStringLiteral(node.moduleSpecifier)&&node.moduleSpecifier.text.startsWith(".")){
    return ctx.factory.updateImportDeclaration(node,node.modifiers,node.importClause,ctx.factory.createStringLiteral(node.moduleSpecifier.text+".js"),node.attributes);
   }return node;
  },ctx)]}});
 files.push({name:"lib/"+name+".js",content:outputText});
}
process.stdout.write(JSON.stringify(files));
