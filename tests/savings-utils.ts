import { newMockEvent } from "matchstick-as"
import { ethereum, Address, BigInt } from "@graphprotocol/graph-ts"
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
} from "../generated/Savings/Savings"

export function createAgreementSentEvent(user: Address): AgreementSent {
  let agreementSentEvent = changetype<AgreementSent>(newMockEvent())

  agreementSentEvent.parameters = new Array()

  agreementSentEvent.parameters.push(
    new ethereum.EventParam("user", ethereum.Value.fromAddress(user))
  )

  return agreementSentEvent
}

export function createAirdropDistributedEvent(
  recipient: Address,
  amount: BigInt
): AirdropDistributed {
  let airdropDistributedEvent = changetype<AirdropDistributed>(newMockEvent())

  airdropDistributedEvent.parameters = new Array()

  airdropDistributedEvent.parameters.push(
    new ethereum.EventParam("recipient", ethereum.Value.fromAddress(recipient))
  )
  airdropDistributedEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )

  return airdropDistributedEvent
}

export function createContractTokenDepositedEvent(
  user: Address,
  amount: BigInt
): ContractTokenDeposited {
  let contractTokenDepositedEvent = changetype<ContractTokenDeposited>(
    newMockEvent()
  )

  contractTokenDepositedEvent.parameters = new Array()

  contractTokenDepositedEvent.parameters.push(
    new ethereum.EventParam("user", ethereum.Value.fromAddress(user))
  )
  contractTokenDepositedEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )

  return contractTokenDepositedEvent
}

export function createContractTokenWithdrawnEvent(
  user: Address,
  amount: BigInt
): ContractTokenWithdrawn {
  let contractTokenWithdrawnEvent = changetype<ContractTokenWithdrawn>(
    newMockEvent()
  )

  contractTokenWithdrawnEvent.parameters = new Array()

  contractTokenWithdrawnEvent.parameters.push(
    new ethereum.EventParam("user", ethereum.Value.fromAddress(user))
  )
  contractTokenWithdrawnEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )

  return contractTokenWithdrawnEvent
}

export function createOwnerRefundEvent(
  user: Address,
  proposalId: BigInt,
  amount: BigInt
): OwnerRefund {
  let ownerRefundEvent = changetype<OwnerRefund>(newMockEvent())

  ownerRefundEvent.parameters = new Array()

  ownerRefundEvent.parameters.push(
    new ethereum.EventParam("user", ethereum.Value.fromAddress(user))
  )
  ownerRefundEvent.parameters.push(
    new ethereum.EventParam(
      "proposalId",
      ethereum.Value.fromUnsignedBigInt(proposalId)
    )
  )
  ownerRefundEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )

  return ownerRefundEvent
}

export function createOwnerWithdrawEvent(
  user: Address,
  proposalId: BigInt,
  amount: BigInt
): OwnerWithdraw {
  let ownerWithdrawEvent = changetype<OwnerWithdraw>(newMockEvent())

  ownerWithdrawEvent.parameters = new Array()

  ownerWithdrawEvent.parameters.push(
    new ethereum.EventParam("user", ethereum.Value.fromAddress(user))
  )
  ownerWithdrawEvent.parameters.push(
    new ethereum.EventParam(
      "proposalId",
      ethereum.Value.fromUnsignedBigInt(proposalId)
    )
  )
  ownerWithdrawEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )

  return ownerWithdrawEvent
}

export function createOwnershipTransferredEvent(
  previousOwner: Address,
  newOwner: Address
): OwnershipTransferred {
  let ownershipTransferredEvent = changetype<OwnershipTransferred>(
    newMockEvent()
  )

  ownershipTransferredEvent.parameters = new Array()

  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam(
      "previousOwner",
      ethereum.Value.fromAddress(previousOwner)
    )
  )
  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam("newOwner", ethereum.Value.fromAddress(newOwner))
  )

  return ownershipTransferredEvent
}

export function createStableCoinDepositedEvent(
  user: Address,
  amount: BigInt
): StableCoinDeposited {
  let stableCoinDepositedEvent = changetype<StableCoinDeposited>(newMockEvent())

  stableCoinDepositedEvent.parameters = new Array()

  stableCoinDepositedEvent.parameters.push(
    new ethereum.EventParam("user", ethereum.Value.fromAddress(user))
  )
  stableCoinDepositedEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )

  return stableCoinDepositedEvent
}

export function createStableCoinWithdrawnEvent(
  user: Address,
  amount: BigInt
): StableCoinWithdrawn {
  let stableCoinWithdrawnEvent = changetype<StableCoinWithdrawn>(newMockEvent())

  stableCoinWithdrawnEvent.parameters = new Array()

  stableCoinWithdrawnEvent.parameters.push(
    new ethereum.EventParam("user", ethereum.Value.fromAddress(user))
  )
  stableCoinWithdrawnEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )

  return stableCoinWithdrawnEvent
}
