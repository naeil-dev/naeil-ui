import re,json,subprocess,tarfile,tempfile,hashlib,urllib.request
# Opt-in maintainer refresh; normal builds use checked-in notices offline.
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
root=Path.cwd()
modules=set()
for p in Path('storybook-static').rglob('*.js'):
 if '/assets/' in str(p): continue
 modules.update(m.group(1) for m in re.finditer(r'node_modules/((?:@[^/]+/)?[^/\s"\']+)',p.read_text()))
modules.discard('.pnpm')
version=json.loads(Path('package.json').read_text())['devDependencies']['storybook']
source_url=f'https://raw.githubusercontent.com/storybookjs/storybook/v{version}/yarn.lock'
lock=urllib.request.urlopen(source_url).read().decode();versions={}
for name,version in re.findall(r'^  resolution: "((?:@[^/]+/)?[^@]+)@npm:([^"#]+)"$',lock,re.M):
 if name in modules: versions.setdefault(name,set()).add(version)
installed={}
for store in Path('node_modules/.pnpm').iterdir():
 d=store/'node_modules'
 if not d.is_dir():continue
 for p in d.iterdir():
  for pkgdir in (list(p.iterdir()) if p.name.startswith('@') and p.is_dir() else [p]):
   if (pkgdir/'package.json').is_file():
    pkg=json.loads((pkgdir/'package.json').read_text());installed.setdefault(pkg['name'],{})[pkg['version']]=pkgdir
requests=[];known=[]
for name in sorted(modules):
 choices=versions.get(name,set())
 if not choices: choices=set(installed.get(name,{}))
 if not choices:
  choices={{'is-dom':'1.1.0','is-function':'1.0.2','is-object':'1.0.2','is-window':'1.0.2'}[name]}
  known.append(name)
 for v in sorted(choices):requests.append((name,v))
def fetch(request):
 name,v=request
 try:
  pkgdir=installed.get(name,{}).get(v)
  if pkgdir:
   files=[p for p in pkgdir.iterdir() if p.is_file() and re.match(r'^(license|licence|notice|copying)([._-].*)?$',p.name,re.I)]
   if files:return {'name':name,'version':v,'source':f'https://registry.npmjs.org/{name}/{v}','notices':[{'file':p.name,'text':p.read_text()} for p in files]}
  with tempfile.TemporaryDirectory(prefix='naeil-notice-') as tmp:
   output=subprocess.check_output(['npm','pack',f'{name}@{v}','--ignore-scripts','--json','--pack-destination',tmp],text=True,stderr=subprocess.DEVNULL)
   packed=json.loads(output)[0]
   with tarfile.open(Path(tmp)/packed['filename']) as tar:
    notices=[]
    for member in tar.getmembers():
     if member.isfile() and re.match(r'^(license|licence|notice|copying)([._-].*)?$',Path(member.name).name,re.I):
      data=tar.extractfile(member).read().decode('utf8',errors='replace')
      notices.append({'file':member.name.removeprefix('package/'),'text':data})
    return {'name':name,'version':v,'source':f'https://registry.npmjs.org/{name}/{v}','notices':notices}
 except Exception as e:return {'name':name,'version':v,'error':type(e).__name__}
with ThreadPoolExecutor(max_workers=8) as pool:
 results=list(pool.map(fetch,requests))

for package in results:
 if package.get('notices'): continue
 name=package['name']
 if name.startswith('@radix-ui/'):
  package['notices']=[{'file':'Radix-MIT.txt','source':'radix-ui installed LICENSE (same upstream primitives notice)','text':Path('node_modules/radix-ui/LICENSE').read_text()}]
 elif name in ['popper.js','store2','toggle-selection']:
  file={'popper.js':'popper','store2':'store2','toggle-selection':'toggle-selection'}[name]
  package['notices']=[{'file':file+'-MIT.txt','text':Path('licenses/'+file+'-MIT.txt').read_text()}]
 elif name=='use-composed-ref':
  meta=json.loads(subprocess.check_output(['npm','view','use-composed-ref@'+package['version'],'--json'],text=True))
  terms=Path('LICENSE').read_text().split('Permission is hereby granted',1)[1]
  package['notices']=[{'file':'upstream-licensing-metadata.json','text':json.dumps({k:meta[k] for k in ['name','version','license','author','repository'] if k in meta},indent=2)}, {'file':'declared-SPDX-MIT-terms.txt','text':'Full terms for declared MIT. Upstream provided no standalone copyright notice; no date is invented.\n\nPermission is hereby granted'+terms}]
for package in results:
 if package['name'] in known:
  package['scope']='Embedded version is unspecified. Conservative original npm notice source; no exact embedded-version claim.'
assert all(package.get('notices') for package in results), 'Missing full notice: inspect failed package before updating'
out={'scope':'Conservative Storybook source-lock version superset for embedded manager/addon module names; exact installed Vite graph is collected separately. Four unversioned vendored modules use explicitly identified notice sources.', 'sourceLock':{'url':source_url,'sha256':hashlib.sha256(lock.encode()).hexdigest()}, 'packages':results}
Path('.storybook/manager-notices.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print(len(results),'complete manager/addon notice entries')
