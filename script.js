document.addEventListener('DOMContentLoaded', () => {

const state = {yName:'Y', xNames:['X1']};

const yNameInput = document.getElementById('y-name');
const addXbtn = document.getElementById('add-x');
const addRowBtn = document.getElementById('add-row');
const calcBtn = document.getElementById('calc');
const exportBtn = document.getElementById('export-csv');
const predictBtn = document.getElementById('predict-btn');
const toggleThemeBtn = document.getElementById('toggle-theme');

const thead = document.getElementById('thead');
const tbody = document.getElementById('tbody');
const equationPre = document.getElementById('equation');
const statsDiv = document.getElementById('stats');
const coefTableDiv = document.getElementById('coef-table');
const predictInputs = document.getElementById('predict-inputs');
const predictOutput = document.getElementById('predict-output');

// ---------- Table ----------
function renderTable(){
    thead.innerHTML='';
    const tr=document.createElement('tr');
    tr.appendChild(document.createElement('th')).textContent=state.yName;
    state.xNames.forEach(x=>tr.appendChild(document.createElement('th')).textContent=x);
    tr.appendChild(document.createElement('th')).textContent='Remove';
    thead.appendChild(tr);
    if(tbody.children.length===0){
        for(let i=0;i<5;i++) addRow();
    }
    renderPredictInputs();
}

function addRow(){
    const tr=document.createElement('tr');
    const tdY=document.createElement('td');
    const inY=document.createElement('input'); inY.className='cell'; inY.type='number'; inY.step='any';
    tdY.appendChild(inY); tr.appendChild(tdY);

    state.xNames.forEach(()=>{
        const td=document.createElement('td');
        const inp=document.createElement('input'); inp.className='cell'; inp.type='number'; inp.step='any';
        td.appendChild(inp); tr.appendChild(td);
    });

    const tdRemove=document.createElement('td');
    const btn=document.createElement('button'); btn.textContent='–';
    btn.addEventListener('click',()=>tr.remove());
    tdRemove.appendChild(btn); tr.appendChild(tdRemove);

    tbody.appendChild(tr);
}

function renderPredictInputs(){
    predictInputs.innerHTML='';
    state.xNames.forEach(name=>{
        const input=document.createElement('input'); input.type='number'; input.step='any';
        input.placeholder=name;
        predictInputs.appendChild(input);
    });
}

// ---------- Read Data ----------
function readData(){
    const rows=Array.from(tbody.querySelectorAll('tr'));
    const y=[],X=[];
    rows.forEach(tr=>{
        const vals=Array.from(tr.querySelectorAll('input')).map(i=>i.value===''?0:parseFloat(i.value));
        if(vals.every(v=>v==='')) return;
        y.push(vals[0]);
        X.push(vals.slice(1));
    });
    return {y,X};
}
function prepareDesignMatrix(X){ return X.map(r=>[1,...r]); }

// ---------- Linear Regression ----------
function linearRegression(X,y){
    const XT=math.transpose(X);
    const XTX=math.multiply(XT,X);
    const XTXi=math.inv(XTX);
    const XTy=math.multiply(XT,y.map(v=>[v]));
    const beta=math.multiply(XTXi,XTy);
    return beta.map(v=>v[0]);
}

function rSquared(y,yhat){
    const mean=y.reduce((a,b)=>a+b,0)/y.length;
    const ssTot=y.reduce((a,b)=>a+(b-mean)**2,0);
    const ssRes=y.reduce((a,b,i)=>a+(b-yhat[i])**2,0);
    return 1-ssRes/ssTot;
}

function adjustedRSquared(r2,n,p){
    return 1 - (1 - r2) * (n - 1) / (n - p - 1);
}

function stdError(y,yhat,p){
    const n = y.length;
    const ssRes = y.reduce((sum,v,i)=>sum+(v-yhat[i])**2,0);
    return Math.sqrt(ssRes / (n - p - 1));
}

function formatEquation(beta){ return `Y = ${beta[0].toFixed(4)} + `+beta.slice(1).map((b,i)=>`${b.toFixed(4)}·${state.xNames[i]}`).join(' + '); }

// ---------- Charts ----------
function renderScatter(y,yhat){
    const trace1={x:y,y:yhat,mode:'markers',name:'Fitted vs Actual',marker:{color:'#34d399',size:8}};
    const line={x:[Math.min(...y.concat(yhat)),Math.max(...y.concat(yhat))],
                y:[Math.min(...y.concat(yhat)),Math.max(...y.concat(yhat))],
                mode:'lines',name:'45°',line:{color:'#0ea5a0',dash:'dash'}};
    Plotly.react('scatter-plot',[trace1,line],{margin:{t:10},xaxis:{title:'Actual Y'},yaxis:{title:'Fitted Y'}});
}

function renderResiduals(yhat,residuals){
    const trace={x:yhat,y:residuals,mode:'markers',marker:{color:'#f87171',size:8}};
    Plotly.react('residual-plot',[trace],{margin:{t:10},xaxis:{title:'Fitted Y'},yaxis:{title:'Residuals'}});
}

function renderExcelPlots(X,yhat,residuals){
    const container=document.getElementById('charts');

    // Remove old Excel-style plots except main scatter and residual
    Array.from(container.querySelectorAll('.excel-chart')).forEach(c=>c.remove());

    X[0].forEach((_, j)=>{
        // Fitted plot
        const divFit=document.createElement('div');
        divFit.className='chart excel-chart';
        container.appendChild(divFit);

        const traceFit={x:X.map(r=>r[j]), y:yhat, mode:'markers', type:'scatter', marker:{color:'rgba(52,211,153,0.7)', size:7}, name:`Fitted X${j+1}`};
        const layoutFit={title:`X${j+1} – Fitted vs Y`, margin:{t:40}};
        Plotly.newPlot(divFit,[traceFit],layoutFit,{responsive:true});

        // Residual plot
        const divRes=document.createElement('div');
        divRes.className='chart excel-chart';
        container.appendChild(divRes);

        const traceRes={x:X.map(r=>r[j]), y:residuals, mode:'markers', type:'scatter', marker:{color:'rgba(248,113,113,0.7)', size:7}, name:`Residuals X${j+1}`};
        const layoutRes={title:`X${j+1} – Residuals`, margin:{t:40}};
        Plotly.newPlot(divRes,[traceRes],layoutRes,{responsive:true});
    });
}

// ---------- Compute ----------
function computeAndRender(){
    try{
        const {X,y}=readData();
        if(y.length<2){alert('Kamida 2 ta qator kerak'); return;}
        const Xmat=prepareDesignMatrix(X);
        const beta=linearRegression(Xmat,y);
        const yhat=Xmat.map(row=>row.reduce((s,v,i)=>s+v*beta[i],0));
        const r2=rSquared(y,yhat);
        const adjR2=adjustedRSquared(r2,y.length,state.xNames.length);
        const se=stdError(y,yhat,state.xNames.length);

        equationPre.textContent=formatEquation(beta);
        statsDiv.innerHTML=`Observations: ${y.length} &nbsp; R²: ${r2.toFixed(4)} &nbsp; Adjusted R²: ${adjR2.toFixed(4)} &nbsp; Std Error: ${se.toFixed(4)}`;

        coefTableDiv.innerHTML='';
        const ct=document.createElement('div'); ct.className='code';
        const lines=[`Intercept: ${beta[0].toFixed(6)}`];
        beta.slice(1).forEach((b,i)=>lines.push(`${state.xNames[i]}: ${b.toFixed(6)}`));
        ct.textContent=lines.join('\n'); coefTableDiv.appendChild(ct);

        renderScatter(y,yhat);
        renderResiduals(yhat,y.map((v,i)=>v-yhat[i]));
        renderExcelPlots(X,yhat,y.map((v,i)=>v-yhat[i]));
    }catch(e){alert('Xatolik: '+e.message);}
}

// ---------- Events ----------
addXbtn.addEventListener('click',()=>{state.xNames.push('X'+(state.xNames.length+1)); renderTable();});
addRowBtn.addEventListener('click',addRow);
yNameInput.addEventListener('input',e=>{state.yName=e.target.value; renderTable();});
calcBtn.addEventListener('click',computeAndRender);

exportBtn.addEventListener('click',()=>{
    const {y,X}=readData();
    const header=[state.yName,...state.xNames];
    const lines=[header.join(',')];
    y.forEach((v,i)=>lines.push([v,...X[i]].join(',')));
    const blob=new Blob([lines.join('\n')],{type:'text/csv'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download='data.csv'; a.click(); URL.revokeObjectURL(url);
});

predictBtn.addEventListener('click',()=>{
    const inputs=Array.from(predictInputs.querySelectorAll('input')).map(i=>i.value===''?0:parseFloat(i.value));
    const {X,y}=readData(); if(y.length<1){alert('Ma\'lumot kiriting'); return;}
    const Xmat=prepareDesignMatrix(X);
    const beta=linearRegression(Xmat,y);
    const ypred=beta[0]+inputs.reduce((s,v,i)=>s+beta[i+1]*v,0);
    predictOutput.textContent=`Prognoz: Y ≈ ${ypred.toFixed(6)}`;
});

toggleThemeBtn.addEventListener('click',()=>{document.body.classList.toggle('light-mode');});

renderTable();

});


