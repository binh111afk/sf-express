class Graph {
  constructor() {
    this.adjacencyList = {};
  }

  addNode(node) {
    if (!this.adjacencyList[node]) {
      this.adjacencyList[node] = [];
    }
  }

  // distance: khoảng cách thực tế
  // isBlocked: true nếu kẹt xe hoặc ngập lụt (đường bị bỏ, không đi qua)
  addEdge(u, v, distance, isBlocked = false) {
    this.addNode(u);
    this.addNode(v);
    this.adjacencyList[u].push({ to: v, distance, isBlocked });
    this.adjacencyList[v].push({ to: u, distance, isBlocked });
  }

  updateRoadCondition(u, v, isBlocked) {
    const edge1 = this.adjacencyList[u]?.find(e => e.to === v);
    if (edge1) edge1.isBlocked = isBlocked;

    const edge2 = this.adjacencyList[v]?.find(e => e.to === u);
    if (edge2) edge2.isBlocked = isBlocked;
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { Graph };
}