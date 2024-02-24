import {
  DefaultContext,
  ExtendedRequest,
  jsonStringify,
  requiredEnvVar,
} from '@lawallet/module';
import type { Response } from 'express';

type DepositRequest = {
  // limit: null,
  amount: string;
  receiverPubkey: string;
  token: string;
};

async function handler<Context extends DefaultContext>(
  req: ExtendedRequest<Context>,
  res: Response,
) {
  const depositReq: DepositRequest = req.body as DepositRequest;
  switch (depositReq.token) {
    case 'RBTC':
      const options = {
        method: 'GET',
      };

      const urlxRes = await fetch(
        `${requiredEnvVar('FEDERATION_API_ENDPOINT')}/lnurlp/${depositReq.receiverPubkey}/callback?amount=${depositReq.amount}`,
        options,
      );
      if (urlxRes.status === 200) {
        const invoice = ((await urlxRes.json()) as { pr: string }).pr;
        console.log(invoice);
        const swapRequest = {
          from: 'RBTC',
          to: 'BTC',
          invoice,
        };
        const options = {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: jsonStringify(swapRequest),
        };

        try {
          const swapRes = await fetch(
            'https://testnet.boltz.exchange/api/v2/swap/submarine',
            options,
          );
          if (swapRes.status === 200) {
            // TODO: create lock
            res.status(200).send();
          } else {
            res
              .status(400)
              .json({ status: 'ERROR', message: await swapRes.text() })
              .send();
          }
        } catch (err) {
          console.log(err);
          res.status(400).json({ status: 'ERROR', message: err }).send();
        }
      } else {
        res
          .status(400)
          .json({ status: 'ERROR', message: await urlxRes.text() })
          .send();
      }
      break;
    default:
      res
        .status(400)
        .json({ status: 'ERROR', message: 'Token not supported' })
        .send();
  }
}

export default handler;
