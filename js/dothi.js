class Graph{
    sodinh;
    matranke;

    constructor(sodinh){
        this.sodinh=sodinh;
        this.matranke=[];
        for(let i=0;i<this.sodinh;i++){
            let row=[];
            for(let j=0;j<sodinh;j++){
                row.push(0);
            }
            this.matranke.push(row);
        }
    }

    addCanh(u,v,trongso){
        this.matranke[u][v]=trongso;
        this.matranke[v][u]=trongso;
    }

    deleteCanh(u,v){
        this.matranke[u][v]=0;
        this.matranke[v][u]=0;
    }

    xuatGraph(){
        for(let i=0;i<this.sodinh;i++){
            console.log(this.matranke[i].join(" "));
        }
    }
}

module.exports=Graph;