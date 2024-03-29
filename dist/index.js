#!/usr/bin/env node
import{execSync}from"child_process";import fs from"fs";import{fileURLToPath}from"url";import path from"path";import chalk from"chalk";import prompts from"prompts";import https from"https";const __filename=fileURLToPath(import.meta.url),__dirname=path.dirname(__filename);let updateAnswer=null;function configureBrowserSyncCommand(e,s){const t=s.PROJECT_ROOT_PATH.indexOf("\\htdocs\\");if(-1===t)return"";const n=s.PROJECT_ROOT_PATH.substring(0,t+"\\htdocs\\".length).replace(/\\/g,"\\\\"),i=s.PROJECT_ROOT_PATH.replace(new RegExp(`^${n}`),"").replace(/\\/g,"/");let c=`http://localhost/${i}`;c=c.endsWith("/")?c.slice(0,-1):c;const r=c.replace(/(?<!:)(\/\/+)/g,"/"),a=i.replace(/\/\/+/g,"/"),o=`\n  const { createProxyMiddleware } = require("http-proxy-middleware");\n\n  module.exports = {\n    // First middleware: Set Cache-Control headers\n    function (req, res, next) {\n      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");\n      res.setHeader("Pragma", "no-cache");\n      res.setHeader("Expires", "0");\n      next();\n    },\n    // Use the 'middleware' option to create a proxy that masks the deep URL.\n    middleware: [\n      // This middleware intercepts requests to the root and proxies them to the deep path.\n      createProxyMiddleware("/", {\n        target:\n          "${r}",\n        changeOrigin: true,\n        pathRewrite: {\n          "^/": "/${a.startsWith("/")?a.substring(1):a}", // Rewrite the path.\n        },\n      }),\n    ],\n    proxy: "http://localhost:3000", // Proxy the BrowserSync server.\n    // serveStatic: ["src/app"], // Serve static files from this directory.\n    files: "src/**/*.*",\n    notify: false,\n    open: false,\n    ghostMode: false,\n  };`,l=path.join(e,"settings","bs-config.cjs");return fs.writeFileSync(l,o,"utf8"),"browser-sync start --config settings/bs-config.cjs"}async function updatePackageJson(e,s,t){const n=path.join(e,"package.json");if(checkExcludeFiles(n))return;const i=JSON.parse(fs.readFileSync(n,"utf8")),c=configureBrowserSyncCommand(e,s);i.scripts=Object.assign(Object.assign({},i.scripts),{postinstall:"prisma generate"});let r=[];t.tailwindcss&&(i.scripts=Object.assign(Object.assign({},i.scripts),{tailwind:"postcss ./src/app/css/tailwind.css -o ./src/app/css/styles.css --watch"}),r.push("tailwind")),t.websocket&&(i.scripts=Object.assign(Object.assign({},i.scripts),{websocket:"node ./settings/restartWebsocket.cjs"}),r.push("websocket"));const a=Object.assign({},i.scripts);r.length>0&&(a["browser-sync"]=c),a.dev=r.length>0?`npm-run-all --parallel browser-sync ${r.join(" ")}`:c,i.scripts=a,i.type="module",i.prisma={seed:"node prisma/seed.js"},fs.writeFileSync(n,JSON.stringify(i,null,2))}async function updateComposerJson(e,s){if(!s.websocket)return;const t=path.join(e,"composer.json");if(checkExcludeFiles(t))return;let n;if(fs.existsSync(t)){{const e=fs.readFileSync(t,"utf8");n=JSON.parse(e)}s.websocket&&(n.require=Object.assign(Object.assign({},n.require),{"cboden/ratchet":"^0.4.4"})),fs.writeFileSync(t,JSON.stringify(n,null,2))}}async function updateIndexJsForWebSocket(e,s){if(!s.websocket)return;const t=path.join(e,"src","app","js","index.js");if(checkExcludeFiles(t))return;let n=fs.readFileSync(t,"utf8");n+='\n// WebSocket initialization\nconst ws = new WebSocket("ws://localhost:8080");\n',fs.writeFileSync(t,n,"utf8")}async function createUpdateGitignoreFile(e,s){const t=path.join(e,".gitignore");if(checkExcludeFiles(t))return;let n="";fs.existsSync(t)&&(n=fs.readFileSync(t,"utf8")),s.forEach((e=>{n.includes(e)||(n+=`\n${e}`)})),n=n.trimStart(),fs.writeFileSync(t,n)}function copyRecursiveSync(e,s){const t=fs.existsSync(e),n=t&&fs.statSync(e);if(t&&n&&n.isDirectory())fs.mkdirSync(s,{recursive:!0}),fs.readdirSync(e).forEach((t=>{copyRecursiveSync(path.join(e,t),path.join(s,t))}));else{if(checkExcludeFiles(s))return;fs.copyFileSync(e,s,0)}}async function executeCopy(e,s){s.forEach((({srcDir:s,destDir:t})=>{copyRecursiveSync(path.join(__dirname,s),path.join(e,t))}))}function createOrUpdateTailwindConfig(e){const s=path.join(e,"tailwind.config.js");if(checkExcludeFiles(s))return;let t=fs.readFileSync(s,"utf8");const n=["./src/app/**/*.{html,js,php}"].map((e=>`    "${e}"`)).join(",\n");t=t.replace(/content: \[\],/g,`content: [\n${n}\n],`),fs.writeFileSync(s,t,{flag:"w"})}function modifyPostcssConfig(e){const s=path.join(e,"postcss.config.js");if(checkExcludeFiles(s))return;fs.writeFileSync(s,"export default {\n  plugins: {\n    tailwindcss: {},\n    autoprefixer: {},\n    cssnano: {},\n  },\n};",{flag:"w"})}function modifyLayoutPHP(e,s){const t=path.join(e,"src","app","layout.php");if(!checkExcludeFiles(t))try{let e=fs.readFileSync(t,"utf8");const n='\n    <link href="<?php echo $baseUrl; ?>css/index.css" rel="stylesheet">\n    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">\n    <script src="<?php echo $baseUrl; ?>js/index.js"><\/script>',i=s?`    <link href="<?php echo $baseUrl; ?>css/styles.css" rel="stylesheet"> ${n}`:`    <script src="https://cdn.tailwindcss.com"><\/script> ${n}`;e=e.replace("</head>",`${i}\n</head>`),fs.writeFileSync(t,e,{flag:"w"})}catch(e){}}async function createOrUpdateEnvFile(e,s){const t=path.join(e,".env");if(checkExcludeFiles(t))return;let n=fs.existsSync(t)?fs.readFileSync(t,"utf8"):"";n.includes(s)||(n+=`${""!==n?"\n\n":""}${s}`,fs.writeFileSync(t,n,{flag:"w"}))}function checkExcludeFiles(e){var s,t;return!!(null==updateAnswer?void 0:updateAnswer.isUpdate)&&(null!==(t=null===(s=null==updateAnswer?void 0:updateAnswer.excludeFilePath)||void 0===s?void 0:s.includes(e.replace(/\\/g,"/")))&&void 0!==t&&t)}async function createDirectoryStructure(e,s,t){const n=[{src:"/bootstrap.php",dest:"/bootstrap.php"},{src:"/.htaccess",dest:"/.htaccess"},{src:"/../composer.json",dest:"/composer.json"}];(null==updateAnswer?void 0:updateAnswer.isUpdate)&&(n.push({src:"/.env",dest:"/.env"},{src:"/tsconfig.json",dest:"/tsconfig.json"}),updateAnswer.tailwindcss&&n.push({src:"/postcss.config.js",dest:"/postcss.config.js"},{src:"/tailwind.config.js",dest:"/tailwind.config.js"}));n.forEach((({src:s,dest:t})=>{const n=path.join(__dirname,s),i=path.join(e,t);if(checkExcludeFiles(i))return;const c=fs.readFileSync(n,"utf8");fs.writeFileSync(i,c,{flag:"w"})})),await executeCopy(e,[{srcDir:"/settings",destDir:"/settings"},{srcDir:"/prisma",destDir:"/prisma"},{srcDir:"/src",destDir:"/src"}]),await updatePackageJson(e,t,s),await updateComposerJson(e,s),await updateIndexJsForWebSocket(e,s),s.tailwindcss?(createOrUpdateTailwindConfig(e),modifyLayoutPHP(e,!0),modifyPostcssConfig(e)):modifyLayoutPHP(e,!1);await createOrUpdateEnvFile(e,'# PHPMailer\nSMTP_HOST=smtp.gmail.com\nSMTP_USERNAME=john.doe@gmail.com\nSMTP_PASSWORD=123456\nSMTP_PORT=587\nSMTP_ENCRYPTION=ssl\nMAIL_FROM=john.doe@gmail.com\nMAIL_FROM_NAME="John Doe"'),await createUpdateGitignoreFile(e,["vendor"])}async function getAnswer(e={}){var s,t,n;const i=[];e.projectName||i.push({type:"text",name:"projectName",message:"What is your project named?",initial:"my-app"}),e.tailwindcss||i.push({type:"toggle",name:"tailwindcss",message:`Would you like to use ${chalk.blue("Tailwind CSS")}?`,initial:!0,active:"Yes",inactive:"No"}),e.websocket||i.push({type:"toggle",name:"websocket",message:`Would you like to use ${chalk.blue("Websocket")}?`,initial:!0,active:"Yes",inactive:"No"});const c=i,r=()=>{process.exit(0)};try{const i=await prompts(c,{onCancel:r});return 0===Object.keys(i).length?null:{projectName:i.projectName?String(i.projectName).trim().replace(/ /g,"-"):null!==(s=e.projectName)&&void 0!==s?s:"my-app",tailwindcss:null!==(t=i.tailwindcss)&&void 0!==t?t:e.tailwindcss,websocket:null!==(n=i.websocket)&&void 0!==n?n:e.websocket}}catch(e){return null}}async function installDependencies(e,s,t=!1){fs.existsSync(path.join(e,"package.json"))||execSync("npm init -y",{stdio:"inherit",cwd:e}),s.forEach((e=>{}));const n=`npm install ${t?"--save-dev":""} ${s.join(" ")}`;execSync(n,{stdio:"inherit",cwd:e})}async function uninstallDependencies(e,s,t=!1){s.forEach((e=>{}));const n=`npm uninstall ${t?"--save-dev":"--save"} ${s.join(" ")}`;execSync(n,{stdio:"inherit",cwd:e})}function fetchPackageVersion(e){return new Promise(((s,t)=>{https.get(`https://registry.npmjs.org/${e}`,(e=>{let n="";e.on("data",(e=>n+=e)),e.on("end",(()=>{try{const e=JSON.parse(n);s(e["dist-tags"].latest)}catch(e){t(new Error("Failed to parse JSON response"))}}))})).on("error",(e=>t(e)))}))}const readJsonFile=e=>{const s=fs.readFileSync(e,"utf8");return JSON.parse(s)};async function main(){var e,s,t,n,i;try{const c=process.argv.slice(2);let r=c[0],a=null;if(r){const i={projectName:r,tailwindcss:c.includes("--tailwindcss"),websocket:c.includes("--websocket")};if(a=await getAnswer(i),null===a)return;const o=process.cwd(),l=path.join(o,"prisma-php.json"),p=readJsonFile(l);let d=[];null===(e=p.excludeFiles)||void 0===e||e.map((e=>{const s=path.join(o,e);fs.existsSync(s)&&d.push(s.replace(/\\/g,"/"))})),updateAnswer={projectName:r,tailwindcss:null!==(s=null==a?void 0:a.tailwindcss)&&void 0!==s&&s,websocket:null!==(t=null==a?void 0:a.websocket)&&void 0!==t&&t,isUpdate:!0,excludeFiles:null!==(n=p.excludeFiles)&&void 0!==n?n:[],excludeFilePath:null!=d?d:[],filePath:o}}else a=await getAnswer();if(null===a)return;execSync("npm install -g create-prisma-php-app",{stdio:"inherit"}),execSync("npm install -g browser-sync",{stdio:"inherit"}),r||fs.mkdirSync(a.projectName);const o=process.cwd();let l=r?o:path.join(o,a.projectName);r||process.chdir(a.projectName);const p=["prisma","@prisma/client","typescript","@types/node","ts-node","http-proxy-middleware"];a.tailwindcss&&p.push("tailwindcss","autoprefixer","postcss","postcss-cli","cssnano"),a.websocket&&p.push("chokidar-cli"),(a.tailwindcss||a.websocket)&&p.push("npm-run-all"),await installDependencies(l,p,!0),r||(execSync("npx prisma init",{stdio:"inherit"}),execSync("npx tsc --init",{stdio:"inherit"})),a.tailwindcss&&execSync("npx tailwindcss init -p",{stdio:"inherit"});const d={PROJECT_NAME:a.projectName,PROJECT_ROOT_PATH:l.replace(/\\/g,"\\\\"),PHP_ROOT_PATH_EXE:"D:\\\\xampp\\\\php\\\\php.exe",PHP_GENERATE_CLASS_PATH:"src/Lib/Prisma/Classes"};await createDirectoryStructure(l,a,d);const u=path.join(l,"settings","project-settings.js"),f=`export const projectSettings = {\n      PROJECT_NAME: "${a.projectName}",\n      PROJECT_ROOT_PATH: "${l.replace(/\\/g,"\\\\")}",\n      PHP_ROOT_PATH_EXE: "D:\\\\xampp\\\\php\\\\php.exe",\n      PHP_GENERATE_CLASS_PATH: "src/Lib/Prisma/Classes",\n    };`;fs.writeFileSync(u,f,{flag:"w"});const h=path.join(l,"public");if(fs.existsSync(h)||fs.mkdirSync(h),!a.tailwindcss){const e=path.join(l,"src","app","css");["tailwind.css","styles.css"].forEach((s=>{const t=path.join(e,s);fs.existsSync(t)&&fs.unlinkSync(t)}))}if(!a.websocket){const e=path.join(l,"src","lib","websocket");fs.existsSync(e)&&fs.rmSync(e,{recursive:!0,force:!0});const s=path.join(l,"settings");["restartWebsocket.cjs","restart_websocket.bat"].forEach((e=>{const t=path.join(s,e);fs.existsSync(t)&&fs.unlinkSync(t)}))}if(null==updateAnswer?void 0:updateAnswer.isUpdate){const e=[];if(!updateAnswer.tailwindcss){["postcss.config.js","tailwind.config.js"].forEach((e=>{const s=path.join(l,e);fs.existsSync(s)&&fs.unlinkSync(s)})),e.push("tailwindcss","autoprefixer","postcss","postcss-cli","cssnano")}updateAnswer.websocket||e.push("chokidar-cli"),e.length>0&&await uninstallDependencies(l,e,!0)}const w=await fetchPackageVersion("create-prisma-php-app"),y={projectName:a.projectName,tailwindcss:a.tailwindcss,websocket:a.websocket,version:w,excludeFiles:null!==(i=null==updateAnswer?void 0:updateAnswer.excludeFiles)&&void 0!==i?i:[]};fs.writeFileSync(path.join(l,"prisma-php.json"),JSON.stringify(y,null,2),{flag:"w"})}catch(e){process.exit(1)}}main();