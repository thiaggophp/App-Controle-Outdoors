import{useEffect,useRef}from"react";
export default function Modal({open,onClose,title,children}){
  const ignore=useRef(false);
  const contentRef=useRef(null);

  useEffect(()=>{document.body.style.overflow=open?"hidden":""},[open]);

  // Guarda visibilitychange (galeria do sistema abre app separado)
  useEffect(()=>{
    const fn=()=>{if(document.hidden){ignore.current=true}else{setTimeout(()=>{ignore.current=false},800)}};
    document.addEventListener("visibilitychange",fn);
    return()=>document.removeEventListener("visibilitychange",fn);
  },[]);

  // Guarda câmera iOS: overlay dentro do Safari NÃO dispara visibilitychange
  // Detecta toque em input[type=file] ou label que o contém e bloqueia backdrop por 4s
  useEffect(()=>{
    const content=contentRef.current;
    if(!content)return;
    const onPointer=(e)=>{
      const label=e.target.closest("label");
      const isFile=e.target.type==="file";
      const isFileLabel=label&&label.querySelector("input[type='file']");
      if(isFile||isFileLabel){ignore.current=true;setTimeout(()=>{ignore.current=false},4000);}
    };
    content.addEventListener("pointerdown",onPointer,true);
    return()=>content.removeEventListener("pointerdown",onPointer,true);
  },[open]);

  if(!open)return null;
  return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",zIndex:1000,display:"flex",alignItems:"flex-end",justifyContent:"center",animation:"fadeIn .2s ease"}} onClick={e=>{if(e.target===e.currentTarget&&!ignore.current)onClose()}}>
    <div ref={contentRef} style={{background:"#0f1623",borderRadius:"24px 24px 0 0",width:"100%",maxWidth:480,padding:"24px 20px 40px",animation:"slideUp .25s ease",maxHeight:"90vh",overflowY:"auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h3 style={{color:"#f1f5f9",fontSize:17,fontWeight:700}}>{title}</h3>
        <button onClick={onClose} style={{background:"rgba(255,255,255,0.06)",border:"none",borderRadius:10,width:32,height:32,color:"#64748b",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
      </div>
      {children}
    </div>
  </div>);
}
