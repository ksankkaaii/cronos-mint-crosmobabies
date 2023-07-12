import { memo, useEffect } from "react";
import { Modal } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import MetaMaskOnboarding from "@metamask/onboarding";

import {
  connectAccount,
  onLogout,
  setShowWrongChainModal,
  chainConnect,
} from "../globalState/user";

// const MButton = styled(Button)({
//   // backgroundColor: 'rgb(23, 33, 94)',
//   boxShadow: 'rgb(0 0 0 / 59%) 6px 6px 20px 6px',
//   fontWeight: 400,
//   fontSize: '1.2rem',
//   padding: '10px',
//   minWidth: '138px',
//   borderRadius: '8px',
//   color: 'white'
// });

const WalletConnectButton = ({mint, paused, isMinting}) => {
  const dispatch = useDispatch();

  const walletAddress = useSelector((state) => {
    return state.user.address;
  });

  const correctChain = useSelector((state) => {
    return state.user.correctChain;
  });
  const user = useSelector((state) => {
    return state.user;
  });
  const needsOnboard = useSelector((state) => {
    return state.user.needsOnboard;
  });

  const logout = async () => {
    dispatch(onLogout());
  };

  const connectWalletPressed = async () => {
    if (needsOnboard) {
      const onboarding = new MetaMaskOnboarding();
      onboarding.startOnboarding();
    } else {
      dispatch(connectAccount());
    }
  };

  useEffect(() => {
    let defiLink = localStorage.getItem("DeFiLink_session_storage_extension");
    if (defiLink) {
      try {
        const json = JSON.parse(defiLink);
        if (!json.connected) {
          dispatch(onLogout());
        }
      } catch (error) {
        dispatch(onLogout());
      }
    }
    if (
      localStorage.getItem("WEB3_CONNECT_CACHED_PROVIDER") ||
      window.ethereum ||
      localStorage.getItem("DeFiLink_session_storage_extension")
    ) {
      if (!user.provider) {
        if (window.navigator.userAgent.includes("Crypto.com DeFiWallet")) {
          dispatch(connectAccount(false, "defi"));
        } else {
          dispatch(connectAccount());
        }
      }
    }
    if (!user.provider) {
      if (window.navigator.userAgent.includes("Crypto.com DeFiWallet")) {
        dispatch(connectAccount(false, "defi"));
      }
    }

    // eslint-disable-next-line
  }, []);

  const onWrongChainModalClose = () => {
    dispatch(setShowWrongChainModal(false));
  };

  const onWrongChainModalChangeChain = () => {
    dispatch(setShowWrongChainModal(false));
    dispatch(chainConnect());
  };

  return (
    <div>
      {!walletAddress && (
        <button
          className="font-coiny mt-12 w-full bg-gradient-to-br from-brand-purple to-brand-pink shadow-lg px-6 py-3 rounded-md text-2xl text-white hover:shadow-pink-400/50 mx-4 tracking-wide uppercase"
          onClick={() => connectWalletPressed()}
        >
          Connect Wallet
        </button>
      )}
      {walletAddress && !correctChain && !user.showWrongChainModal && (
        <button
          className="absolute right-4 bg-indigo-600 transition duration-200 ease-in-out font-chalk border-2 border-[rgba(0,0,0,1)] shadow-[0px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none px-4 py-2 rounded-md text-sm text-white tracking-wide uppercase"
          onClick={() => onWrongChainModalChangeChain()}
        >
          Switch Network
        </button>
      )}
      {walletAddress && correctChain && (
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
      )}

      <Modal show={user.showWrongChainModal} onHide={onWrongChainModalClose}>
        <Modal.Header closeButton>
          <Modal.Title>Wrong network</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          To continue, you need to switch the network to{" "}
          <span style={{ fontWeight: "bold" }}>Cronos Chain</span>.{" "}
        </Modal.Body>
        <Modal.Footer>
          <button
            className="p-4 pt-2 pb-2 btn_menu inline white lead"
            onClick={onWrongChainModalClose}
          >
            Close
          </button>
          <button
            className="p-4 pt-2 pb-2 btn_menu inline white lead btn-outline"
            onClick={onWrongChainModalChangeChain}
          >
            Switch
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};
export default memo(WalletConnectButton);
