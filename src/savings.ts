import {
  AgreementSent as AgreementSentEvent,
  AirdropDistributed as AirdropDistributedEvent,
  ContractTokenDeposited as ContractTokenDepositedEvent,
  ContractTokenWithdrawn as ContractTokenWithdrawnEvent,
  OwnerRefund as OwnerRefundEvent,
  OwnerWithdraw as OwnerWithdrawEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  StableCoinDeposited as StableCoinDepositedEvent,
  StableCoinWithdrawn as StableCoinWithdrawnEvent
} from "../generated/Savings/Savings"
import {
  AgreementSent,
  AirdropDistributed,
  ContractTokenDeposited,
  ContractTokenWithdrawn,
  OwnerRefund,
  OwnerWithdraw,
  OwnershipTransferred,
  StableCoinDeposited,
  StableCoinWithdrawn
} from "../generated/schema"

export function handleAgreementSent(event: AgreementSentEvent): void {
  let entity = new AgreementSent(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.user = event.params.user

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleAirdropDistributed(event: AirdropDistributedEvent): void {
  let entity = new AirdropDistributed(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.recipient = event.params.recipient
  entity.amount = event.params.amount

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleContractTokenDeposited(
  event: ContractTokenDepositedEvent
): void {
  let entity = new ContractTokenDeposited(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.user = event.params.user
  entity.amount = event.params.amount

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleContractTokenWithdrawn(
  event: ContractTokenWithdrawnEvent
): void {
  let entity = new ContractTokenWithdrawn(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.user = event.params.user
  entity.amount = event.params.amount

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleOwnerRefund(event: OwnerRefundEvent): void {
  let entity = new OwnerRefund(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.user = event.params.user
  entity.proposalId = event.params.proposalId
  entity.amount = event.params.amount

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleOwnerWithdraw(event: OwnerWithdrawEvent): void {
  let entity = new OwnerWithdraw(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.user = event.params.user
  entity.proposalId = event.params.proposalId
  entity.amount = event.params.amount

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleOwnershipTransferred(
  event: OwnershipTransferredEvent
): void {
  let entity = new OwnershipTransferred(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.previousOwner = event.params.previousOwner
  entity.newOwner = event.params.newOwner

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleStableCoinDeposited(
  event: StableCoinDepositedEvent
): void {
  let entity = new StableCoinDeposited(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.user = event.params.user
  entity.amount = event.params.amount

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleStableCoinWithdrawn(
  event: StableCoinWithdrawnEvent
): void {
  let entity = new StableCoinWithdrawn(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.user = event.params.user
  entity.amount = event.params.amount

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}
