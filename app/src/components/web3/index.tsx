import { useEffect, useState, useMemo } from "react";
import { useQueryParams, IAsyncResult, ShowError } from '../utils';

import { Spinner } from "react-bootstrap";
import { ChainInfo, Injectedweb3, ConnectCtx } from './injected';
import constate from 'constate';

//the default chain needs to be the first One
const supportedChains: ChainInfo[] = [
    { chainId: '56', name: 'Binance Smart Chain', hexChainId: '0x38', rpcProvider: 'https://bsc-dataseed.binance.org/', contracts:{
        rabbitMaster:'0x00',
        czodiacNFT:'0x00',
        rabbitRocket:'0x00',
        rabbitGreed:'0x00',
        rabbitCreed:'0x00'
    } },
    { chainId: '97', name: 'bsc Testnet', hexChainId: '0x61', rpcProvider: 'https://data-seed-prebsc-1-s1.binance.org:8545/',contracts:{
        rabbitMaster:'0x0B354F634E142183827C6bB413E7afB4388D13C9',
        czodiacNFT:'0x17A894724063e274E355285B2B5A36d8b1493C0f',
        rabbitRocket:'0x85b4E156d1BBEb532DD74cA503AC9a62B80bb9dE',
        rabbitGreed:'0x2d5a53fF2850AEb2EEb1941B2D401A1a9B0C5B51',
        rabbitCreed:'0x3BB8d5Dec011be1EcA2592D6fd205E8F3947A59f'
    }  }
];

export const [Web3Provider,
    useweb3Context, useConnectCalls] = constate(
        useWeb3,
        v => v.ctx,
        v => v.connector
    );

function useWeb3() {
    const [ctx, setCtx] = useState<ConnectCtx & { chainInfo: ChainInfo, reconnecting?:boolean, mintCount?:number }>();

    const connect = async (chainInfo: ChainInfo) => {
        const injected = new Injectedweb3();
        const r = await injected.connect(chainInfo);
        setCtx({ ...r, chainInfo });
        return r;
    }

    const disconnect = async () => {
        if (!ctx?.chainInfo)
            return;

        try{
            setCtx({...ctx,reconnecting:true});

            const injected = new Injectedweb3();
            await injected.disconnect();
            const r = await injected.connect(ctx?.chainInfo);
            setCtx({ ...r, chainInfo: ctx?.chainInfo });
   
        }catch(error:any){
            setCtx({...ctx,reconnecting:false});
            console.error(`failed to reconnect ${error}`);
        }

    }

    const reloadNFTs = async () => {
        
        if(!ctx){
            console.error('ctx is not yet initialized');
            return;
        }
        
        const mintCount = (ctx?.mintCount||0)+1;

        setCtx({...ctx,mintCount});

    };

    const connector = useMemo(() => ({
        connect,
        disconnect,
        reloadNFTs
    }), [ctx]);

    return { ctx, connector };
}


export function ConnectWallet() {

    const qParams = useQueryParams();
    const { connect } = useConnectCalls();
    const liftedCtx = useweb3Context();


    const [web3ctx, setWeb3Ctx] = useState<IAsyncResult<{
        ctx?: ConnectCtx;
    }>>({ isLoading: true });

    useEffect(() => {
        console.log('connecting wallet');

        if(liftedCtx?.reconnecting){
            console.log('wallet is reconnecting exit');
            return;
        }

        let injected: any = undefined;

        if (typeof window !== "undefined") {
            injected = (window as any)?.ethereum;
        }

        if (!injected) {
            console.log("no injected provider found");
            setWeb3Ctx({ result: {} });
            return;
        }

        const usingTestnet = qParams['network'] == 'test';
        console.log(`usingTestnet = ${usingTestnet}`);


        (async () => {
            try {

                if(!usingTestnet){
                    throw new Error('mainnet contracts not yet deployed. Try on testnet by adding "?network=test"');
                }

                const chainInfo = supportedChains[usingTestnet ? 1 : 0];

                const ctx = await connect(chainInfo);
                setWeb3Ctx({ result: { ctx } });

            } catch (error: any) {
                setWeb3Ctx({ error });
            }

        })();

    }, []);

    if (!!web3ctx.isLoading || liftedCtx?.reconnecting) {
        return <div className="p-3 d-flex ">
            <Spinner animation="border" variant="primary" />
            <span className="m-1">Waiting for wallet</span>
        </div>;
    }

    if (!!web3ctx?.error) {
        return <ShowError error={web3ctx?.error} />
    }

    if (web3ctx.result && !web3ctx.result.ctx) {
        return <div className="text-center">
            <h2>No injected wallet found</h2>
            <p>We suggest installing <a href="https://metamask.io/download">Metamask</a></p>
        </div>;
    }

    return <div>ok </div>;



    /*
    return (
        <div>
          {`The current page is: ${qParams['network']||'unknown'}`}
          
        </div>
    );
    */
}
