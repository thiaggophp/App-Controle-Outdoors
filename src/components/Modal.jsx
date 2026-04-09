import{useRef,useEffect}from"react";
export default function Modal({open,onClose,title,children}){
  const bdTouch=useRef(false);
  const isTouch=useRef(false);
  useEffect(()=>{document.body.style.overflow=open?"hidden":""},[open]);
  const onBdStart=(e)=>{isTouch.current=true;bdTouch.current=(e.target===e.currentTarget)};
  const onBdEnd=(e)=>{if(bdTouch.current&&e.target===e.currentTarget)onClose();bdTouch.current=false};
  const onBdClick=(e)=>{if(!isTouch.current&&e.target===e.currentTarget)onClose()};
  if(!open)return null;
  return(<div
    onTouchStart={onBdStart} onTouchEnd={onBdEnd} onTouchCancel={()=>{bdTouch.current=false}}
    onClick={onBdClick}
    style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",zIndex:1000,display:"flex",alignItems:"flex-end",justifyContent:"center",animation:"fadeIn .2s ease"}}>
    <div onClick={e=>e.stopPropagation()} style={{background:"#0f1623",borderRadius:"24px 24px 0 0",width:"100%",maxWidth:480,padding:"24px 20px 40px",animation:"slideUp .25s ease",maxHeight:"90vh",overflowY:"auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h3 style={{color:"#f1f5f9",fontSize:17,fontWeight:700}}>{title}</h3>
        <button onClick={onClose} style={{background:"rgba(255,255,255,0.06)",border:"none",borderRadius:10,width:32,height:32,color:"#64748b",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
      </div>
      {children}
    </div>
  </div>);
}
