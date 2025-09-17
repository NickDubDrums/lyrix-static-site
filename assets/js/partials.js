
async function loadPartials(){
  const header = document.querySelector('#__header');
  const footer = document.querySelector('#__footer');
  try{
    if(header){
      const h = await fetch('partials/header.html',{cache:'no-cache'});
      header.innerHTML = await h.text();
    }
    if(footer){
      const f = await fetch('partials/footer.html',{cache:'no-cache'});
      footer.innerHTML = await f.text();
      const yearSpan = document.getElementById('year');
      if(yearSpan){ yearSpan.textContent = new Date().getFullYear(); }
    }
  }catch(e){
    console.error('Partials load error', e);
  }
}
document.addEventListener('DOMContentLoaded', loadPartials);
