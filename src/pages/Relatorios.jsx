import{useState,useEffect}from"react";
import{getPontos,getContratos,getPagamentos}from"../db";
import Card from"../components/Card";

function fmt(v){return(v||0).toLocaleString("pt-BR",{minimumFractionDigits:2})}
function fmtData(s){if(!s)return"";const[y,m,d]=s.split("-");return`${d}/${m}/${y}`}

export default function Relatorios({user}){
  const[dados,setDados]=useState(null);

  useEffect(()=>{(async()=>{
    const[pontos,contratos,pagamentos]=await Promise.all([getPontos(user.email),getContratos(user.email),getPagamentos(user.email)]);
    const ativos=contratos.filter(c=>c.status==="ativo");
    const receitaMensal=ativos.reduce((s,c)=>s+(c.valorMensal||0),0);
    const totalRecebido=pagamentos.filter(p=>p.status==="pago").reduce((s,p)=>s+(p.valor||0),0);
    const totalPendente=pagamentos.filter(p=>p.status==="pendente").reduce((s,p)=>s+(p.valor||0),0);
    const ocupados=new Set(ativos.map(c=>c.pontoId)).size;
    const taxaOcupacao=pontos.length>0?Math.round((ocupados/pontos.length)*100):0;

    // Receita por ponto
    const porPonto=pontos.map(p=>{
      const cs=contratos.filter(c=>c.pontoId===p.id);
      const pags=pagamentos.filter(pg=>pg.pontoId===p.id);
      const recebido=pags.filter(pg=>pg.status==="pago").reduce((s,pg)=>s+pg.valor,0);
      const contratoAtivo=cs.find(c=>c.status==="ativo");
      return{...p,recebido,contratoAtivo,totalContratos:cs.length};
    }).sort((a,b)=>b.recebido-a.recebido);

    setDados({pontos,contratos,pagamentos,ativos,receitaMensal,totalRecebido,totalPendente,ocupados,taxaOcupacao,porPonto});
  })()},[user.email]);

  const imprimir=()=>{
    const conteudo=document.getElementById("relatorio-print");
    const janela=window.open("","_blank");
    janela.document.write(`<html><head><title>Relatório — OutdoorControle</title>
    <style>body{font-family:Arial,sans-serif;padding:20px;color:#111}h1{color:#0369a1}table{width:100%;border-collapse:collapse;margin:16px 0}th,td{border:1px solid #ddd;padding:8px 12px;text-align:left}th{background:#f0f9ff;color:#0369a1}.verde{color:#16a34a;font-weight:700}.vermelho{color:#dc2626;font-weight:700}.total{background:#f0f9ff;font-weight:700}</style>
    </head><body>${conteudo.innerHTML}</body></html>`);
    janela.document.close();janela.focus();setTimeout(()=>janela.print(),300);
  };

  if(!dados)return(<div style={{padding:"40px 0",textAlign:"center",color:"#475569"}}>Carregando relatório...</div>);

  return(<div style={{padding:"0 4px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <h2 style={{color:"#f1f5f9",margin:0,fontSize:20,fontWeight:700}}>Relatórios</h2>
      <button onClick={imprimir} style={{background:"rgba(14,165,233,.1)",border:"1px solid rgba(14,165,233,.25)",borderRadius:12,padding:"8px 14px",color:"#38bdf8",fontSize:13,fontWeight:700,cursor:"pointer"}}>🖨️ Imprimir PDF</button>
    </div>

    <div style={{background:"linear-gradient(135deg,#0a1628,#0f1e38)",borderRadius:18,padding:"18px",marginBottom:14,border:"1px solid rgba(14,165,233,.2)"}}>
      <div style={{color:"#38bdf8",fontSize:11,fontWeight:700,letterSpacing:.8,marginBottom:12}}>CONSOLIDADO — {dados.pontos.length} PONTOS</div>
      {[
        ["Receita mensal (contratos ativos)","#0ea5e9",dados.receitaMensal],
        ["Total recebido (histórico)","#22c55e",dados.totalRecebido],
        ["Pagamentos pendentes","#f59e0b",dados.totalPendente],
      ].map(([l,c,v])=><div key={l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <span style={{color:"#94a3b8",fontSize:13}}>{l}</span>
        <span style={{color:c,fontWeight:800,fontSize:15}}>R$ {fmt(v)}</span>
      </div>)}
      <div style={{borderTop:"1px solid rgba(255,255,255,0.06)",paddingTop:10,marginTop:4}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{color:"#94a3b8",fontSize:13}}>Taxa de ocupação</span>
          <span style={{color:dados.taxaOcupacao>=70?"#22c55e":"#f59e0b",fontWeight:800,fontSize:15}}>{dados.taxaOcupacao}%</span>
        </div>
        <div style={{background:"rgba(255,255,255,0.06)",borderRadius:6,height:8,overflow:"hidden",marginTop:8}}>
          <div style={{background:dados.taxaOcupacao>=70?"#22c55e":"#0ea5e9",height:"100%",width:dados.taxaOcupacao+"%",borderRadius:6}}/>
        </div>
        <div style={{color:"#475569",fontSize:11,marginTop:4}}>{dados.ocupados} de {dados.pontos.length} pontos ocupados</div>
      </div>
    </div>

    <h3 style={{color:"#64748b",fontSize:12,fontWeight:700,letterSpacing:.8,marginBottom:8}}>RECEITA POR PONTO</h3>
    {dados.porPonto.map(p=><Card key={p.id}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{color:"#f1f5f9",fontWeight:600,fontSize:14}}>🖼️ {p.nome}</div>
          <div style={{color:"#64748b",fontSize:11}}>{p.totalContratos} contrato(s) · {p.contratoAtivo?<span style={{color:"#22c55e"}}>Ativo</span>:<span style={{color:"#64748b"}}>Disponível</span>}</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{color:"#22c55e",fontWeight:700,fontSize:14}}>R$ {fmt(p.recebido)}</div>
          {p.contratoAtivo&&<div style={{color:"#0ea5e9",fontSize:11}}>R$ {fmt(p.contratoAtivo.valorMensal)}/mês</div>}
        </div>
      </div>
    </Card>)}

    <div id="relatorio-print" style={{display:"none"}}>
      <h1>OutdoorControle — Relatório</h1>
      <p>Gerado em: {new Date().toLocaleDateString("pt-BR")}</p>
      <h2>Consolidado</h2>
      <table><tbody>
        <tr><td>Receita mensal (ativos)</td><td className="verde">R$ {fmt(dados.receitaMensal)}</td></tr>
        <tr><td>Total recebido</td><td className="verde">R$ {fmt(dados.totalRecebido)}</td></tr>
        <tr><td>Pagamentos pendentes</td><td className="vermelho">R$ {fmt(dados.totalPendente)}</td></tr>
        <tr className="total"><td>Taxa de ocupação</td><td>{dados.taxaOcupacao}% ({dados.ocupados}/{dados.pontos.length})</td></tr>
      </tbody></table>
      <h2>Receita por Ponto</h2>
      <table><thead><tr><th>Ponto</th><th>Contratos</th><th>Status</th><th>Mensal</th><th>Recebido</th></tr></thead>
      <tbody>{dados.porPonto.map(p=><tr key={p.id}>
        <td>{p.nome}</td><td>{p.totalContratos}</td>
        <td>{p.contratoAtivo?"Ativo":"Disponível"}</td>
        <td>{p.contratoAtivo?"R$ "+fmt(p.contratoAtivo.valorMensal):"—"}</td>
        <td className="verde">R$ {fmt(p.recebido)}</td>
      </tr>)}</tbody></table>
      <h2>Contratos Ativos</h2>
      <table><thead><tr><th>Anunciante</th><th>Ponto</th><th>Início</th><th>Fim</th><th>Valor/mês</th></tr></thead>
      <tbody>{dados.ativos.map(c=>{const p=dados.pontos.find(pt=>pt.id===c.pontoId);return(<tr key={c.id}><td>{c.anunciante}</td><td>{p?.nome||"—"}</td><td>{fmtData(c.dataInicio)}</td><td>{fmtData(c.dataFim)||"Indeterminado"}</td><td>R$ {fmt(c.valorMensal)}</td></tr>)})}</tbody></table>
    </div>
  </div>);
}
