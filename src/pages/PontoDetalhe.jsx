import{useState,useEffect}from"react";
import{getContratosByPonto,saveContrato,deleteContratoCascade,getPagamentosByContrato,savePagamento,deletePagamento,savePonto}from"../db";
import{Btn,Input,InputMoney,Select}from"../components/FormElements";
import Modal from"../components/Modal";
import Card from"../components/Card";

const HOJE=new Date().toISOString().slice(0,10);
function fmt(v){return(v||0).toLocaleString("pt-BR",{minimumFractionDigits:2})}
function fmtData(s){if(!s)return"";const[y,m,d]=s.split("-");return`${d}/${m}/${y}`}
function mesLabel(s){if(!s)return"";const[y,m]=s.split("-");const ms=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];return(ms[parseInt(m)-1]||m)+"/"+y}

export default function PontoDetalhe({ponto,user,onVoltar,onAtualizar}){
  const[contratos,setContratos]=useState([]);
  const[pagamentos,setPagamentos]=useState({});
  const[contratoAberto,setContratoAberto]=useState(null);
  const[contratoModal,setContratoModal]=useState(false);
  const[pagModal,setPagModal]=useState(false);
  const[deleteModal,setDeleteModal]=useState(null);
  const[editContrato,setEditContrato]=useState(null);
  const[formC,setFormC]=useState({anunciante:"",contato:"",dataInicio:HOJE,dataFim:"",valorMensal:"",obs:""});
  const[formP,setFormP]=useState({mesReferencia:HOJE.slice(0,7),valor:"",status:"pendente"});
  const[autoGerar,setAutoGerar]=useState(true);
  const[geradasMsg,setGeradasMsg]=useState("");

  const recarregar=async()=>{
    const cs=await getContratosByPonto(ponto.id);setContratos(cs);
    const pags={};
    await Promise.all(cs.map(async c=>{pags[c.id]=await getPagamentosByContrato(c.id)}));
    setPagamentos(pags);
  };
  useEffect(()=>{recarregar()},[ponto.id]);

  const abrirContratoNovo=()=>{setEditContrato(null);setFormC({anunciante:"",contato:"",dataInicio:HOJE,dataFim:"",valorMensal:"",obs:""});setAutoGerar(true);setGeradasMsg("");setContratoModal(true)};
  const abrirContratoEditar=(c)=>{setEditContrato(c);setFormC({...c,valorMensal:String(c.valorMensal||"")});setContratoModal(true)};

  const salvarContrato=async()=>{
    if(!formC.anunciante.trim())return;
    const c={...formC,ownerEmail:user.email,pontoId:ponto.id,valorMensal:parseFloat(formC.valorMensal)||0,status:"ativo"};
    if(editContrato){c.id=editContrato.id;c.status=editContrato.status}
    const saved=await saveContrato(c);
    if(!editContrato){
      await savePonto({...ponto,status:"ocupado"});onAtualizar({...ponto,status:"ocupado"});
      if(autoGerar&&c.dataInicio&&c.dataFim){
        const contratoId=saved.id||c.id;
        let cur=new Date(c.dataInicio+"T12:00");cur=new Date(cur.getFullYear(),cur.getMonth(),1);
        const endD=new Date(c.dataFim+"T12:00");const endMes=new Date(endD.getFullYear(),endD.getMonth(),1);
        let count=0;
        while(cur<=endMes){
          const mes=cur.getFullYear()+"-"+String(cur.getMonth()+1).padStart(2,"0");
          await savePagamento({mesReferencia:mes,valor:c.valorMensal,status:"pendente",dataPagamento:"",ownerEmail:user.email,contratoId,pontoId:ponto.id});
          cur.setMonth(cur.getMonth()+1);count++;
        }
        if(count>0)setGeradasMsg(count+" cobranças geradas automaticamente");
      }
    }
    setContratoModal(false);await recarregar();
  };

  const encerrarContrato=async(c)=>{
    await saveContrato({...c,status:"encerrado"});
    const ativos=contratos.filter(ct=>ct.id!==c.id&&ct.status==="ativo");
    if(ativos.length===0){await savePonto({...ponto,status:"disponivel"});onAtualizar({...ponto,status:"disponivel"})}
    await recarregar();
  };

  const excluirContrato=async()=>{
    await deleteContratoCascade(deleteModal.id);setDeleteModal(null);await recarregar();
  };

  const salvarPagamento=async()=>{
    if(!formP.valor)return;
    const p={...formP,ownerEmail:user.email,contratoId:contratoAberto.id,pontoId:ponto.id,valor:parseFloat(formP.valor)||0};
    await savePagamento(p);setPagModal(false);await recarregar();
  };

  const marcarPago=async(pag)=>{
    await savePagamento({...pag,status:"pago",dataPagamento:HOJE});await recarregar();
  };

  const diasRestantes=(c)=>{
    if(!c.dataFim)return null;
    return Math.floor((new Date(c.dataFim+"T12:00")-new Date())/(1000*60*60*24));
  };

  const labels={outdoor:"Outdoor",frontlight:"Front-light",backlight:"Back-light",led:"Painel LED",totem:"Totem",busdoor:"Busdoor",outro:"Outro"};

  const gerarFicha=()=>{
    const fmt=v=>(v||0).toLocaleString("pt-BR",{minimumFractionDigits:2});
    const fmtD=s=>{if(!s)return"";const[y,m,d]=s.split("-");return`${d}/${m}/${y}`};
    const ativo=contratos.find(c=>c.status==="ativo");
    const pags=ativo?pagamentos[ativo.id]||[]:[];
    const recebido=pags.filter(p=>p.status==="pago").reduce((s,p)=>s+p.valor,0);
    const pendente=pags.filter(p=>p.status==="pendente").reduce((s,p)=>s+p.valor,0);
    const janela=window.open("","_blank");
    janela.document.write(`<html><head><title>Ficha — ${ponto.nome}</title>
    <style>*{box-sizing:border-box}body{font-family:Arial,sans-serif;padding:24px;color:#111;max-width:600px;margin:0 auto}h1{color:#0369a1;margin:0 0 4px}h2{color:#0369a1;font-size:14px;margin:18px 0 6px;border-bottom:1px solid #e2e8f0;padding-bottom:4px}p{margin:4px 0;font-size:14px}.badge{display:inline-block;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:700}.ocupado{background:#dbeafe;color:#1d4ed8}.disponivel{background:#dcfce7;color:#166534}.manutencao{background:#fef9c3;color:#713f12}.row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f1f5f9}.val{font-weight:700}.verde{color:#16a34a}.vermelho{color:#dc2626}img{width:100%;max-height:200px;object-fit:cover;border-radius:8px;margin-bottom:12px}@media print{button{display:none}}</style>
    </head><body>
    <h1>🖼️ ${ponto.nome}</h1>
    <span class="badge ${ponto.status==="ocupado"?"ocupado":ponto.status==="manutencao"?"manutencao":"disponivel"}">${ponto.status==="ocupado"?"Ocupado":ponto.status==="manutencao"?"Manutenção":"Disponível"}</span>
    <h2>Dados do Ponto</h2>
    ${ponto.endereco?`<p>📍 ${ponto.endereco}</p>`:""}
    <p>Tipo: ${labels[ponto.tipo]||ponto.tipo}</p>
    ${ponto.largura>0&&ponto.altura>0?`<p>Dimensões: ${ponto.largura}×${ponto.altura}m</p>`:""}
    ${ponto.iluminacao?"<p>💡 Ponto iluminado</p>":""}
    ${ponto.trafego?`<p>🚗 Fluxo: ${ponto.trafego} veíc/dia</p>`:""}
    ${ponto.obs?`<p>Obs: ${ponto.obs}</p>`:""}
    ${ativo?`<h2>Contrato Ativo</h2>
    <div class="row"><span>Anunciante</span><span class="val">${ativo.anunciante}</span></div>
    ${ativo.contato?`<div class="row"><span>Contato</span><span class="val">${ativo.contato}</span></div>`:""}
    <div class="row"><span>Período</span><span class="val">${fmtD(ativo.dataInicio)} — ${fmtD(ativo.dataFim)}</span></div>
    <div class="row"><span>Valor mensal</span><span class="val verde">R$ ${fmt(ativo.valorMensal)}</span></div>
    <h2>Financeiro</h2>
    <div class="row"><span>Total recebido</span><span class="val verde">R$ ${fmt(recebido)}</span></div>
    <div class="row"><span>Pendente</span><span class="val ${pendente>0?"vermelho":""}">R$ ${fmt(pendente)}</span></div>`:"<h2>Sem contrato ativo</h2>"}
    <p style="color:#94a3b8;font-size:11px;margin-top:24px">Gerado em ${new Date().toLocaleDateString("pt-BR")} · OutdoorControle</p>
    <button onclick="window.print()" style="margin-top:12px;padding:8px 20px;background:#0ea5e9;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px">Imprimir / Salvar PDF</button>
    </body></html>`);
    janela.document.close();
  };

  return(<div style={{padding:"0 4px"}}>
    <button onClick={onVoltar} style={{background:"none",border:"none",color:"#0ea5e9",fontSize:14,cursor:"pointer",marginBottom:12,padding:0,display:"flex",alignItems:"center",gap:4}}>← Pontos</button>

    <div style={{background:"linear-gradient(135deg,#0a1628,#0f1e38)",borderRadius:18,padding:"18px",marginBottom:16,border:"1px solid rgba(14,165,233,.2)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <div style={{color:"#f1f5f9",fontWeight:800,fontSize:18,marginBottom:4}}>🖼️ {ponto.nome}</div>
          {ponto.endereco&&<a href={"https://maps.google.com/?q="+encodeURIComponent(ponto.endereco)} target="_blank" rel="noreferrer" style={{color:"#38bdf8",fontSize:12,textDecoration:"none"}}>📍 {ponto.endereco}</a>}
          <div style={{color:"#475569",fontSize:11,marginTop:6,display:"flex",gap:10,flexWrap:"wrap"}}>
            <span>{labels[ponto.tipo]||ponto.tipo}</span>
            {ponto.largura>0&&ponto.altura>0&&<span>{ponto.largura}×{ponto.altura}m</span>}
            {ponto.iluminacao&&<span>💡 Iluminado</span>}
            {ponto.trafego&&<span>🚗 {ponto.trafego} veic/dia</span>}
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
          <span style={{background:ponto.status==="ocupado"?"rgba(14,165,233,.15)":ponto.status==="manutencao"?"rgba(245,158,11,.15)":"rgba(34,197,94,.15)",color:ponto.status==="ocupado"?"#38bdf8":ponto.status==="manutencao"?"#f59e0b":"#22c55e",fontSize:11,fontWeight:700,padding:"4px 10px",borderRadius:12}}>
            {ponto.status==="ocupado"?"Ocupado":ponto.status==="manutencao"?"Manutenção":"Disponível"}
          </span>
          <button onClick={gerarFicha} style={{background:"rgba(14,165,233,.08)",border:"1px solid rgba(14,165,233,.2)",borderRadius:8,padding:"4px 10px",color:"#38bdf8",fontSize:11,fontWeight:600,cursor:"pointer"}}>📄 Ficha</button>
        </div>
      </div>
    </div>

    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
      <h3 style={{color:"#94a3b8",fontSize:13,fontWeight:700,letterSpacing:.8}}>CONTRATOS</h3>
      <button onClick={abrirContratoNovo} style={{background:"rgba(14,165,233,.1)",border:"1px solid rgba(14,165,233,.25)",borderRadius:10,padding:"6px 14px",color:"#38bdf8",fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Novo Contrato</button>
    </div>

    {contratos.length===0&&<Card><div style={{textAlign:"center",color:"#475569",fontSize:13,padding:"16px 0"}}>Nenhum contrato cadastrado</div></Card>}

    {contratos.map(c=>{
      const dias=diasRestantes(c);
      const pags=pagamentos[c.id]||[];
      const totalRecebido=pags.filter(p=>p.status==="pago").reduce((s,p)=>s+p.valor,0);
      const pendente=pags.filter(p=>p.status==="pendente").reduce((s,p)=>s+p.valor,0);
      const aberto=contratoAberto?.id===c.id;
      return(<div key={c.id} style={{background:"#0f1623",borderRadius:16,marginBottom:10,border:"1px solid rgba(255,255,255,0.06)",overflow:"hidden"}}>
        <div onClick={()=>setContratoAberto(aberto?null:c)} style={{padding:"14px 16px",cursor:"pointer"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2,flexWrap:"wrap"}}>
                <span style={{color:"#f1f5f9",fontWeight:700,fontSize:15}}>{c.anunciante}</span>
                <span style={{background:c.status==="ativo"?"rgba(34,197,94,.15)":"rgba(100,116,139,.15)",color:c.status==="ativo"?"#22c55e":"#94a3b8",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:12}}>{c.status==="ativo"?"Ativo":"Encerrado"}</span>
              </div>
              {c.contato&&<div style={{color:"#64748b",fontSize:12}}>📞 {c.contato}</div>}
              <div style={{color:"#475569",fontSize:11,marginTop:4}}>R$ {fmt(c.valorMensal)}/mês · {fmtData(c.dataInicio)} — {fmtData(c.dataFim)}</div>
            </div>
            {dias!==null&&c.status==="ativo"&&<div style={{background:dias<0?"rgba(239,68,68,.1)":dias<7?"rgba(239,68,68,.1)":dias<30?"rgba(245,158,11,.1)":"rgba(14,165,233,.1)",borderRadius:10,padding:"6px 10px",textAlign:"center",flexShrink:0,marginLeft:8}}>
              <div style={{color:dias<0?"#ef4444":dias<7?"#ef4444":dias<30?"#f59e0b":"#38bdf8",fontSize:16,fontWeight:800}}>{dias<0?Math.abs(dias):dias}</div>
              <div style={{color:"#64748b",fontSize:9}}>{dias<0?"atraso":"dias"}</div>
            </div>}
          </div>
        </div>

        {aberto&&<div style={{borderTop:"1px solid rgba(255,255,255,0.04)",padding:"12px 16px"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
            <div>
              <div style={{color:"#22c55e",fontSize:13,fontWeight:600}}>Recebido: R$ {fmt(totalRecebido)}</div>
              {pendente>0&&<div style={{color:"#f59e0b",fontSize:12}}>Pendente: R$ {fmt(pendente)}</div>}
            </div>
            <button onClick={()=>{setFormP({mesReferencia:HOJE.slice(0,7),valor:String(c.valorMensal||""),status:"pendente"});setPagModal(true);}} style={{background:"rgba(34,197,94,.1)",border:"1px solid rgba(34,197,94,.25)",borderRadius:8,padding:"5px 12px",color:"#22c55e",fontSize:12,fontWeight:600,cursor:"pointer"}}>+ Pagamento</button>
          </div>

          {pags.map(p=><div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6,padding:"8px 10px",background:"rgba(255,255,255,0.03)",borderRadius:8}}>
            <div>
              <div style={{color:"#94a3b8",fontSize:12}}>{mesLabel(p.mesReferencia)} · R$ {fmt(p.valor)}</div>
              {p.dataPagamento&&<div style={{color:"#475569",fontSize:11}}>Pago em {fmtData(p.dataPagamento)}</div>}
            </div>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              {p.status==="pendente"&&<button onClick={()=>marcarPago(p)} style={{background:"rgba(34,197,94,.1)",border:"1px solid rgba(34,197,94,.2)",borderRadius:6,padding:"4px 10px",color:"#22c55e",fontSize:11,fontWeight:600,cursor:"pointer"}}>✓ Recebido</button>}
              <span style={{background:p.status==="pago"?"rgba(34,197,94,.15)":"rgba(239,68,68,.15)",color:p.status==="pago"?"#22c55e":"#ef4444",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:8}}>{p.status==="pago"?"Pago":"Pendente"}</span>
            </div>
          </div>)}

          <div style={{display:"flex",gap:6,marginTop:8}}>
            <button onClick={()=>abrirContratoEditar(c)} style={{background:"rgba(14,165,233,.08)",border:"1px solid rgba(14,165,233,.2)",borderRadius:8,padding:"5px 12px",color:"#38bdf8",fontSize:12,fontWeight:600,cursor:"pointer"}}>Editar</button>
            {c.status==="ativo"&&<button onClick={()=>encerrarContrato(c)} style={{background:"rgba(245,158,11,.08)",border:"1px solid rgba(245,158,11,.2)",borderRadius:8,padding:"5px 12px",color:"#f59e0b",fontSize:12,fontWeight:600,cursor:"pointer"}}>Encerrar</button>}
            <button onClick={()=>setDeleteModal(c)} style={{background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",borderRadius:8,padding:"5px 12px",color:"#ef4444",fontSize:12,fontWeight:600,cursor:"pointer"}}>Excluir</button>
          </div>
        </div>}
      </div>);
    })}

    <Modal open={contratoModal} onClose={()=>setContratoModal(false)} title={editContrato?"Editar Contrato":"Novo Contrato"}>
      <Input label="Anunciante" value={formC.anunciante} onChange={e=>setFormC({...formC,anunciante:e.target.value})} placeholder="Nome da empresa ou pessoa"/>
      <Input label="Contato (telefone)" value={formC.contato||""} onChange={e=>setFormC({...formC,contato:e.target.value})} placeholder="(11) 99999-9999"/>
      <Input label="Data de início" type="date" value={formC.dataInicio} onChange={e=>setFormC({...formC,dataInicio:e.target.value})}/>
      <Input label="Data de fim" type="date" value={formC.dataFim||""} onChange={e=>setFormC({...formC,dataFim:e.target.value})}/>
      <InputMoney label="Valor mensal (R$)" value={formC.valorMensal} onChange={e=>setFormC({...formC,valorMensal:e.target.value})} placeholder="0,00"/>
      {editContrato&&<Select label="Status" value={formC.status||"ativo"} onChange={e=>setFormC({...formC,status:e.target.value})} options={[{value:"ativo",label:"Ativo"},{value:"encerrado",label:"Encerrado"}]}/>}
      <Input label="Observações" value={formC.obs||""} onChange={e=>setFormC({...formC,obs:e.target.value})} placeholder="Detalhes adicionais..."/>
      {!editContrato&&<label style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",cursor:"pointer"}}>
        <input type="checkbox" checked={autoGerar} onChange={e=>setAutoGerar(e.target.checked)} style={{width:17,height:17,accentColor:"#0ea5e9"}}/>
        <span style={{color:"#94a3b8",fontSize:13}}>Gerar cobranças mensais automaticamente</span>
      </label>}
      {geradasMsg&&<div style={{background:"rgba(34,197,94,.1)",border:"1px solid rgba(34,197,94,.2)",borderRadius:10,padding:"8px 12px",color:"#22c55e",fontSize:12,marginBottom:8}}>✓ {geradasMsg}</div>}
      <Btn onClick={salvarContrato}>{editContrato?"Salvar Alterações":"Criar Contrato"}</Btn>
    </Modal>

    <Modal open={pagModal} onClose={()=>setPagModal(false)} title="Registrar Pagamento">
      <Input label="Mês de referência" type="month" value={formP.mesReferencia} onChange={e=>setFormP({...formP,mesReferencia:e.target.value})}/>
      <InputMoney label="Valor (R$)" value={formP.valor} onChange={e=>setFormP({...formP,valor:e.target.value})} placeholder="0,00"/>
      <Select label="Status" value={formP.status} onChange={e=>setFormP({...formP,status:e.target.value})} options={[{value:"pendente",label:"Pendente"},{value:"pago",label:"Pago"}]}/>
      <Btn onClick={salvarPagamento}>Registrar</Btn>
    </Modal>

    <Modal open={!!deleteModal} onClose={()=>setDeleteModal(null)} title="Excluir contrato">
      {deleteModal&&<>
        <p style={{color:"#94a3b8",fontSize:14,marginBottom:20,textAlign:"center"}}>Excluir contrato de <strong style={{color:"#f1f5f9"}}>{deleteModal.anunciante}</strong>? Os pagamentos vinculados também serão perdidos.</p>
        <div style={{display:"flex",gap:8}}>
          <Btn onClick={()=>setDeleteModal(null)} color="rgba(255,255,255,0.06)" style={{flex:1,border:"1px solid rgba(255,255,255,0.08)",color:"#94a3b8"}}>Cancelar</Btn>
          <Btn onClick={excluirContrato} color="linear-gradient(135deg,#ef4444,#dc2626)" style={{flex:1}}>Excluir</Btn>
        </div>
      </>}
    </Modal>
  </div>);
}
