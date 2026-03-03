export type AttemptNode = {
  attempt: number;
  method: string;
  endpoint: string;
  status: number;
  responseBody: unknown;
};

export type AttemptTree = {
  nodes: AttemptNode[];
};

export function createAttemptTree(): AttemptTree {
  return { nodes: [] };
}

export function addAttempt(tree: AttemptTree, node: AttemptNode): void {
  tree.nodes.push(node);
}
