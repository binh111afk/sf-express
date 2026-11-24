class Graph {
    constructor(sodinh) {
        this.sodinh = sodinh;
        this.matranke = [];
        for (let u = 0; u < sodinh; u++) {
            this.matranke.push(new Array(sodinh).fill(0));
        }
    }

    addCanh(u, v, trongso) {
        this.matranke[u][v] = trongso;
        this.matranke[v][u] = trongso;
    }
}

window.Graph = Graph;