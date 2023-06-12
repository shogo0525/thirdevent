export const truncateContractAddress = (addr: string) =>
  `${addr.slice(0, 5)}...${addr.slice(-5)}`
