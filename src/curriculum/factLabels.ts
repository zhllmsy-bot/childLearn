export function describeFactId(factId: string) {
  const addition = factId.match(/^(\d+)\+(\d+)$/);
  if (addition) {
    const left = Number(addition[1]);
    const right = Number(addition[2]);
    return `${left} 和 ${right} 合起来是 ${left + right}`;
  }

  const makeTen = factId.match(/^make-ten-(\d+)$/);
  if (makeTen) {
    const start = Number(makeTen[1]);
    return `${start} 再补 ${10 - start} 个凑成 10`;
  }

  const count = factId.match(/^count-(\d+)$/);
  if (count) {
    return `点数 ${Number(count[1])} 个物体`;
  }

  const compare = factId.match(/^compare-(\d+)-(\d+)$/);
  if (compare) {
    const left = Number(compare[1]);
    const right = Number(compare[2]);
    return `比较 ${left} 和 ${right} 哪个更多`;
  }

  const jump = factId.match(/^jump-(\d+)-(\d+)$/);
  if (jump) {
    const start = Number(jump[1]);
    const end = Number(jump[2]);
    return `从 ${start} 跳到 ${end}，距离是 ${end - start}`;
  }

  return factId;
}
