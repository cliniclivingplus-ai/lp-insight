// Research previews only. This script never calls an AI or answer endpoint.
(()=>{
 const form=document.getElementById('researchForm');if(!form)return;
 const status=document.getElementById('researchStatus'),results=document.getElementById('researchResults');
 form.onsubmit=async event=>{event.preventDefault();const button=form.querySelector('button'),medline=document.getElementById('researchProvider')?.value==='medlineplus';button.disabled=true;results.replaceChildren();status.textContent='Searching '+(medline?'MedlinePlus':'PubMed')+'… No AI request is made.';
 try{const response=await fetch(medline?'/api/medlineplus':'/api/pubmed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:document.getElementById('researchQuery').value.trim()})});const data=await response.json();if(!response.ok)throw Error(data.error||'Research search unavailable');const sources=medline?data.sources:data.articles;
 for(const source of sources){const row=document.createElement('div');row.className='file-row';const info=document.createElement('div'),title=document.createElement('strong'),meta=document.createElement('small'),preview=document.createElement('button');title.textContent=source.title;meta.textContent=medline?[source.attribution,'Health-topic summary',source.retrieved_at].filter(Boolean).join(' · '):[source.journal,source.year,'PMID '+source.pmid,(source.publication_types||[]).join(', '),source.evidence_access==='abstract_only'?'Abstract only':'No abstract available'].filter(Boolean).join(' · ');info.append(title,meta);preview.textContent='Preview';preview.onclick=()=>showCloudSource(source);row.append(info,preview);results.append(row);}
 status.textContent=sources.length+' records found. '+data.access_notice+' No AI quota used.';
 }catch(error){status.textContent=error.message||'Research unavailable. No AI request was made.';}finally{button.disabled=false;}};
})();
