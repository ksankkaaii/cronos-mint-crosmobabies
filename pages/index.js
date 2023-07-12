import { useState, useEffect } from 'react'
import Big from 'bignumber.js'
import { useSelector, useDispatch } from "react-redux"
import { providers, Contract, BigNumber } from "ethers"
import { ToastContainer, toast } from "react-toastify"
import { config } from '../dapp.config'
import WalletConnectButton from "../components/WalletConnectButton";

import {
  babyContractAddress,
  chainConfig,
} from "../constants";
import babyAbi from "../artifacts/contracts/CrosmoBaby.sol/AlienCrosmobaby.json";
import {
  onLogout
} from "../globalState/user";

import "react-toastify/dist/ReactToastify.css"

let readBabyContract, readProvider

const errorAlert = (title, err) => {
  console.log(title, JSON.stringify(err))
  toast.error(`${title} ${JSON.stringify(err)}`)
}

export default function Mint() {
  const dispatch = useDispatch();

  const [maxSupply, setMaxSupply] = useState(0)
  const [totalMinted, setTotalMinted] = useState(0)
  const [maxMintAmount, setMaxMintAmount] = useState(0)
  const [paused, setPaused] = useState(false)
  const [saleState, setSaleState] = useState(0)
  const [walletLimit, setWalletLimit] = useState(0)
  const [balance, setBalance] = useState(0)
  const [nftBalance, setNftBalance] = useState(0)
  const [hasCrosmocraft, setHasCrosmocraft] = useState(false)
  const [hasCrosmonaut, setHasCrosmonaut] = useState(false)
  const [mintPrice, setMintPrice] = useState('0')
  const [totalPrice, setTotalPrice] = useState('0')
  const [useHigherGas, setUseHigherGas] = useState(false)

  const [status, setStatus] = useState(null)
  const [mintAmount, setMintAmount] = useState(1)
  const [isMinting, setIsMinting] = useState(false)
  
  const walletAddress = useSelector((state) => {
    return state.user.address;
  });
  const correctChain = useSelector(state => state.user.correctChain)
  const isMetamask = useSelector(state => state.user.isMetamask)
  const babyContract = useSelector((state) => {
    return state.user.babyContract;
  });

  useEffect(() => {
    
    (async () => {
      try {
        if (!!walletAddress && isMetamask && !!window && !!window.ethereum && !correctChain) {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: chainConfig.chainId }],
          });
        }
      } catch (switchError) {
        if (switchError.code === 4902) {
          try {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [chainConfig],
            });
          } catch (err) {
            return errorAlert("error adding chain:",err)
          }
          return errorAlert('error switching chain:',switchError)
        }
      }
      
      try {
        if (!readProvider) {
          try{
            readProvider = new providers.JsonRpcProvider(chainConfig.rpcUrls[0])
            readBabyContract = new Contract(
              babyContractAddress,
              babyAbi.abi,
              readProvider
            );
          }catch(err) {
            errorAlert('Error making provider and contract:',err)
          }
          
          readBabyContract.paused().then(psd => setPaused(psd)).catch(err => errorAlert('Error getting paused:',err))
          readBabyContract.totalSupply().then(tMinted => setTotalMinted(tMinted.toNumber())).catch(err => errorAlert('Error getting total supply:',err))
          readBabyContract.maxSupply().then(maxSpl => setMaxSupply(maxSpl.toNumber())).catch(err => errorAlert('Error getting max supply:',err))
        }
        let newBalance = 0
        if (!!walletAddress) {
          readProvider.getBalance(walletAddress).then(blnc => { setBalance(blnc.toString())}).catch(err => errorAlert('Error getting balance:',err))
          readBabyContract.mintCost(walletAddress).then(price => {
            setMintPrice(price.toString())
            const newTotal = new Big(price.toString()).multipliedBy(mintAmount).toString()
            console.log('totalprice:',newTotal)
            setTotalPrice(newTotal)
          }).catch(err => {errorAlert('Error getting mint cost:',err);return ;})
          newBalance = (await readBabyContract.balanceOf(walletAddress)).toNumber()
          setNftBalance(newBalance)
        }
        
        readBabyContract.saleState().then(async saleSt => {
          setSaleState(saleSt.toNumber())
          let wlLimit = 0
          if (saleSt.toNumber() === 1 && !!walletAddress) {
            const isCraft = await readBabyContract.isCrosmocraft(walletAddress)
            const isNaut = await readBabyContract.isCrosmonaut(walletAddress)
            console.log({isCraft,isNaut})
            setHasCrosmocraft(isCraft)
            setHasCrosmonaut(isNaut)
            if (isCraft || isNaut) {
              wlLimit = 4
            }
          } else if (saleSt.toNumber() === 2) {
            wlLimit = 10
          }
          setWalletLimit(wlLimit)

          setMaxMintAmount(
            Math.max(wlLimit - newBalance, 0)
          )
        }).catch(err => errorAlert('Error getting isowner:',err))
      } catch (err) {
        errorAlert('Error getting contract data:',err)
      }
    })();
  }, [walletAddress])

  useEffect(() => {
    const newTotal = new Big(mintPrice).multipliedBy(mintAmount).toString()
    console.log('totalprice:',newTotal)
    setTotalPrice(newTotal)
  }, [mintAmount])

  const logout = async () => {
    dispatch(onLogout());
  };

  const incrementMintAmount = () => {
    if (mintAmount < maxMintAmount) {
      setMintAmount(mintAmount + 1)
    }
  }

  const decrementMintAmount = () => {
    if (mintAmount > 1) {
      setMintAmount(mintAmount - 1)
    }
  }

  const mint = async () => {
    if (!walletAddress) {
      return setStatus({
        success: false,
        status: 'To be able to mint, you need to connect your wallet'
      })
    }
    if (!correctChain) {
      return setStatus({
        success: false,
        status: 'To be able to mint, you need to change your network to Cronos'
      })
    }
    if (paused) {
      return setStatus({
        success: false,
        message: 'Minting is paused'
      })
    }
    // no start sale
    if (saleState === 0) {
      return setStatus({
        success: false,
        message: 'Sale is not started'
      })
    }
    // pre-sale
    if (saleState === 1 && (!hasCrosmocraft && !hasCrosmonaut)) {
      return setStatus({
        success: false,
        message: 'No Crosmocraft or Crosmonaut'
      })
    }
    if (mintAmount <= 0) {
      return setStatus({
        success: false,
        message: 'Mint amount should not be 0'
      })
    }
    if (nftBalance + mintAmount > walletLimit) {
      return setStatus({
        success: false,
        message: 'Exceeds max mintable nfts per wallet'
      })
    }
    if (totalMinted + mintAmount > maxSupply) {
      return setStatus({
        success: false,
        message: 'Exceeds max mintable nfts'
      })
    }
    
    if (new Big(balance).lt(new Big(totalPrice))) {
      return setStatus({
        success: false,
        message: 'Insufficient fund'
      })
    }
    // const { success, status } = await publicMint(mintAmount,totalPrice, useHigherGas,walletAddress)
    setIsMinting(true)
    const gasEstimated = await babyContract.estimateGas.mint(mintAmount, {
      value: totalPrice,
    });
    let tx
    if (useHigherGas) {
      const gas = Math.ceil(gasEstimated.toNumber() * 1.5);
      const gasNumber = BigNumber.from(gas);
      tx = await babyContract.mint(mintAmount, {
        value: totalPrice,
        gasLimit: gasNumber,
      });
    } else {
      tx = await babyContract.mint(mintAmount, {value:totalPrice})
    }
    try {
      await tx.wait()
    } catch(err) {
      return setIsMinting(false)
    }

    setStatus({
      success: true,
      message: 'Minting Success'
    })

    let newBalance
    readBabyContract.totalSupply().then(tMinted => setTotalMinted(tMinted.toNumber())).catch(err => errorAlert('Error getting total supply:',err))
    newBalance = (await readBabyContract.balanceOf(walletAddress)).toNumber()
    setNftBalance(newBalance)
    setMaxMintAmount(
      Math.max(walletLimit - newBalance, 0)
    )

    setIsMinting(false)
  }

  return (
    <div className="min-h-screen h-full w-full overflow-hidden flex flex-col items-center justify-center bg-brand-background ">
      <div className="relative w-full h-full flex flex-col items-center justify-center">
        <img
          src="/images/blur.jpeg"
          className="animate-pulse-slow absolute inset-auto block w-full min-h-screen object-cover"
        />

        <div className="flex flex-col items-center justify-center h-full w-full px-2 md:px-10">
          <div className="relative z-1 md:max-w-3xl w-full bg-gray-900/90 filter backdrop-blur-sm py-4 rounded-md px-2 md:px-10 flex flex-col items-center">
            {walletAddress && (
              <button
                className="absolute right-4 bg-indigo-600 transition duration-200 ease-in-out font-chalk border-2 border-[rgba(0,0,0,1)] shadow-[0px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none px-4 py-2 rounded-md text-sm text-white tracking-wide uppercase"
                onClick={() =>
                  logout()
                }
              >
                Disconnect
              </button>
            )}
            <h1 className="font-coiny uppercase font-bold text-3xl md:text-4xl bg-gradient-to-br  from-brand-green to-brand-blue bg-clip-text text-transparent mt-3">
              {paused ? 'Paused' : (saleState === 1 ? 'Pre-Sale' : (saleState === 2 ? 'Public Sale' : 'Sale not started'))}
            </h1>
            <h3 className="text-sm text-pink-200 tracking-widest">
              {walletAddress
                ? walletAddress.slice(0, 8) +
                  '...' +
                  walletAddress.slice(-4)
                : ''}
            </h3>

            <div className="flex flex-col md:flex-row md:space-x-14 w-full mt-10 md:mt-14">
              <div className="relative w-full">
                <div className="font-coiny z-10 absolute top-2 left-2 opacity-80 filter backdrop-blur-lg text-base px-4 py-2 bg-black border border-brand-purple rounded-md flex items-center justify-center text-white font-semibold">
                  <p>
                    <span className="text-brand-pink">{totalMinted}</span> /{' '}
                    {maxSupply}
                  </p>
                </div>

                <img
                  src="/images/crosmo-babies.gif"
                  className="object-cover w-full sm:h-[280px] md:w-[250px] rounded-md"
                />
              </div>

              <div className="flex flex-col items-center w-full px-4 mt-16 md:mt-0">
                <div className="font-coiny flex items-center justify-between w-full">
                <button
                    className="w-14 h-10 md:w-16 md:h-12 flex items-center justify-center text-brand-background hover:shadow-lg bg-gray-300 font-bold rounded-md"
                    onClick={() => decrementMintAmount()}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 md:h-8 md:w-8"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M18 12H6"
                      />
                    </svg>
                  </button>

                  <p className="flex items-center justify-center flex-1 grow text-center font-bold text-brand-pink text-3xl md:text-4xl">
                    {mintAmount}
                  </p>

                  <button
                    className="w-14 h-10 md:w-16 md:h-12 flex items-center justify-center text-brand-background hover:shadow-lg bg-gray-300 font-bold rounded-md"
                    onClick={() => incrementMintAmount()}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 md:h-8 md:w-8"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                  </button>
                </div>

                <p className="text-sm text-pink-200 tracking-widest mt-3">
                  Max Mint Amount: {walletLimit}
                </p>

                <div className="border-t border-b py-4 mt-16 w-full">
                  <div className="w-full text-xl font-coiny flex items-center justify-between text-brand-yellow">
                    <p>Total</p>

                    <div className="flex items-center space-x-3">
                      <p>
                        {new Big(totalPrice).div(new Big(10).pow(18)).toFixed(2)}{' '}
                        CRO
                      </p>{' '}
                      <span className="text-gray-400">+ GAS</span>
                    </div>
                  </div>
                </div>

                {/* Mint Button && Connect Wallet Button */}
                <WalletConnectButton paused={paused} isMinting={isMinting} mint={mint}/>
                {/* {walletAddress ? (
                  <button
                    className={` ${
                      paused || isMinting
                        ? 'bg-gray-900 cursor-not-allowed'
                        : 'bg-gradient-to-br from-brand-purple to-brand-pink shadow-lg hover:shadow-pink-400/50'
                    } font-coiny mt-12 w-full px-6 py-3 rounded-md text-2xl text-white  mx-4 tracking-wide uppercase`}
                    disabled={paused || isMinting}
                    onClick={() => mint()}
                  >
                    {isMinting ? 'Minting...' : 'Mint'}
                  </button>
                ) : (
                  <button
                    className="font-coiny mt-12 w-full bg-gradient-to-br from-brand-purple to-brand-pink shadow-lg px-6 py-3 rounded-md text-2xl text-white hover:shadow-pink-400/50 mx-4 tracking-wide uppercase"
                    onClick={() => connect()}
                  >
                    Connect Wallet
                  </button>
                )} */}
                <div className="mt-3">
                <input
                  className="text-sm text-pink-200 tracking-widest mt-3 mr-1"
                  type="checkbox"
                  id="mdcHigherGas"
                  value="Use higher gas to reduce mint failure chance"
                  text="Use higher gas to reduce mint failure chance"
                  checked={useHigherGas}
                  onChange={(e) => setUseHigherGas(e.target.checked)}
                />
                <label className='text-pink-200'>Use higher gas to reduce mint failure chance</label>
                </div>
              </div>
            </div>

            {/* Status */}
            {status && (
              <div
                className={`border ${
                  status.success ? 'border-green-500' : 'border-brand-pink-400 '
                } rounded-md text-start h-full px-4 py-4 w-full mx-auto mt-8 md:mt-4"`}
              >
                <p className="flex flex-col space-y-2 text-white text-sm md:text-base break-words ...">
                  {status.message}
                </p>
              </div>
            )}

            {/* Contract Address */}
            <div className="border-t border-gray-800 flex flex-col items-center mt-10 py-2 w-full">
              <h3 className="font-coiny text-2xl text-brand-pink uppercase mt-6">
                Contract Address
              </h3>
              <a
                href={`https://cronoscan.com/address/${config.contractAddress}#readContract`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 mt-4"
              >
                <span className="break-all ...">{config.contractAddress}</span>
              </a>
              <div className="text-gray-400 mt-4">
                Total Minted: {totalMinted} | Max Supply: {maxSupply}{!!walletAddress &&` | Wallet Limit: ${walletLimit}`}
              </div>
              <div className='flex flex-row mt-4 gap-4'>
                <a href="https://discord.gg/yhyJjZ2uWk"><img src='/images/discord.png' width={40} height={40}/></a>
                <a href="https://twitter.com/crosmonaut"><img src='/images/twitter.png' width={40} height={40}/></a>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ToastContainer />
    </div>
  )
}
