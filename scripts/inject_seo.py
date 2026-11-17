#!/usr/bin/env python3
"""Add missing SEO tags to static build output; preserve existing metadata."""
import argparse, html, json, re, sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import quote, urlparse

class Info(HTMLParser):
    def __init__(self):
        super().__init__(); self.head=False; self.titling=False; self.title=''; self.meta={}; self.canonical=None; self.jsonld=False
    def handle_starttag(self, tag, pairs):
        a={k.lower():v or '' for k,v in pairs}
        if tag=='head': self.head=True
        if not self.head: return
        if tag=='title': self.titling=True
        if tag=='meta':
            for key in ('name','property'):
                if key in a: self.meta[a[key].lower()]=a.get('content','')
        if tag=='link' and 'canonical' in a.get('rel','').lower().split(): self.canonical=a.get('href','')
        if tag=='script' and a.get('type','').lower()=='application/ld+json': self.jsonld=True
    def handle_endtag(self,tag):
        if tag=='title': self.titling=False
        if tag=='head': self.head=False
    def handle_data(self,data):
        if self.head and self.titling: self.title+=data

def main():
    ap=argparse.ArgumentParser(description=__doc__); ap.add_argument('output',help='Generated static output folder'); ap.add_argument('--config',default='seo/pages.json'); args=ap.parse_args()
    root=Path(args.output).resolve(); c=json.loads(Path(args.config).read_text(encoding='utf-8')); base=c['site_url'].rstrip('/'); u=urlparse(base)
    if u.scheme!='https' or not u.netloc or u.path or u.query or u.fragment: raise ValueError('site_url must be an HTTPS origin without a path')
    if not (root/'index.html').is_file(): raise ValueError('Build output must contain index.html')
    for path in sorted(root.rglob('*.html')):
        rel=path.relative_to(root)
        if path.name.lower() in ('404.html','500.html') or any(x in ('404','500') for x in rel.parts[:-1]): print('SKIP',rel); continue
        s=path.read_text(encoding='utf-8')
        if not re.search(r'</head\s*>',s,re.I): raise ValueError(f'{rel}: closing head not found')
        i=Info(); i.feed(s)
        parts=list(rel.parts); route='/'+'/'.join(quote(part,safe='-._~') for part in (parts[:-1] if parts[-1]=='index.html' else parts))
        if parts[-1]=='index.html' and len(parts)>1: route+='/'
        page=c.get('pages',{}).get(route,{})
        fallback=c['site_name'] if route=='/' else f"{(rel.parent.name if path.name=='index.html' else path.stem).replace('-', ' ').replace('_', ' ').title()} | {c['author']}"
        title=i.title.strip() or page.get('title') or fallback
        desc=i.meta.get('description') or page.get('description') or c['description']
        canonical=i.canonical if i.canonical is not None else base+route
        if not urlparse(canonical).scheme or not urlparse(canonical).netloc: raise ValueError(f'{rel}: existing canonical is not absolute')
        esc=lambda x:html.escape(str(x),quote=True)
        tags=[]
        if not i.title.strip(): tags.append('    <title>'+esc(title)+'</title>')
        if 'description' not in i.meta: tags.append(f'    <meta name="description" content="{esc(desc)}">')
        if i.canonical is None: tags.append(f'    <link rel="canonical" href="{esc(canonical)}">')
        values={'og:type':'website','og:site_name':c['site_name'],'og:title':title,'og:description':desc,'og:url':canonical,'og:image':c['social_image'],'twitter:card':'summary_large_image','twitter:title':title,'twitter:description':desc,'twitter:image':c['social_image']}
        for k,v in values.items():
            if k not in i.meta: tags.append(f'    <meta {"property" if k.startswith("og:") else "name"}="{esc(k)}" content="{esc(v)}">')
        if not i.jsonld:
            graph=[{'@type':'WebPage','@id':canonical+'#webpage','url':canonical,'name':title,'isPartOf':{'@id':base+'/#website'}},{'@type':'WebSite','@id':base+'/#website','url':base+'/','name':c['site_name'],'publisher':{'@id':base+'/#person'}},{'@type':'Person','@id':base+'/#person','name':c['author'],'url':base+'/','sameAs':c.get('profiles',[])}]
            data=json.dumps({'@context':'https://schema.org','@graph':graph},ensure_ascii=False,separators=(',',':')).replace('<','\\u003c').replace('>','\\u003e').replace('&','\\u0026')
            tags.append('    <script type="application/ld+json">'+data+'</script>')
        if tags:
            s=re.sub(r'</head\s*>',lambda m:'\n'.join(tags)+'\n'+m.group(0),s,count=1,flags=re.I); path.write_text(s,encoding='utf-8')
        print(('UPDATED' if tags else 'UNCHANGED'),rel,'->',canonical)
if __name__=='__main__':
    try: main()
    except (OSError,ValueError,KeyError) as e: print('ERROR:',e,file=sys.stderr); sys.exit(1)
