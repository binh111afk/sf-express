const Graph=require('./dothi.js');

function DuongDi(dinh_truoc, dinh_dich){
    let duongdi=[];
    for(let i=dinh_dich;i!=-1;i=dinh_truoc[i]){
        duongdi.push(i);
    }
    return duongdi.reverse();
}

function dijkstra(graph, dinhnguon){
    const sodinh=graph.sodinh;
    const matranke=graph.matranke;

    let khoangcach=new Array(sodinh).fill(Infinity);
    let trangthai=new Array(sodinh).fill(false);
    let dinh_truoc=new Array(sodinh).fill(-1);

    khoangcach[dinhnguon]=0;

    for(let i=0;i<sodinh;i++){
        let u=-1;
        let min=Infinity;

        for(let j=0;j<sodinh;j++){
            if(trangthai[j]==false && khoangcach[j]<min){
                min=khoangcach[j];
                u=j;
            }
        }
        trangthai[u]=true;

        for(let v=0;v<sodinh;v++){
            if(trangthai[v]==false && matranke[u][v]>0 && khoangcach[u]+matranke[u][v]<khoangcach[v]){
                khoangcach[v]=khoangcach[u]+matranke[u][v];
                dinh_truoc[v]=u;
            }
        }
    }
    for(let i=0;i<sodinh;i++){
        let duong=DuongDi(dinh_truoc,i);
        let lotrinh=khoangcach[i]===Infinity?'Khong co duong di':duong.join('->');
        console.log(`Den dinh ${i}, khoang cach: ${khoangcach[i]}, lo trinh: ${lotrinh}`);
    }
}

module.exports=dijkstra;