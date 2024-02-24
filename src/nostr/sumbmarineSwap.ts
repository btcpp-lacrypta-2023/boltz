import {
  DefaultContext,
  EventHandler,
  jsonStringify,
  requiredEnvVar,
  responseEvent,
} from '@lawallet/module';
import { NDKFilter, NostrEvent } from 'node_modules/@nostr-dev-kit/ndk/dist';

const filter: NDKFilter = {
  kinds: [1112],
  '#t': ['submarine-swap-request'],
  since: Math.floor(Date.now() / 1000) - 86000,
  until: Math.floor(Date.now() / 1000) + 86000,
};

type DepositRequest = {
  amount: string;
  receiverPubkey: string;
  token: string;
};

function getHandler<Context extends DefaultContext = DefaultContext>(
  ctx: Context,
): EventHandler {
  return async (event: NostrEvent): Promise<void> => {
    const depositReq: DepositRequest = JSON.parse(
      event.content,
    ) as DepositRequest;
    switch (depositReq.token) {
      case 'RBTC': {
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
              const resEvent = responseEvent('submarine-swap-ok', '', event);
              ctx.outbox.publish(resEvent);
            } else {
              const resEvent = responseEvent(
                'submarine-swap-error',
                await swapRes.text(),
                event,
              );
              ctx.outbox.publish(resEvent);
            }
          } catch (err) {
            console.log(err);
            const resEvent = responseEvent(
              'submarine-swap-error',
              err as string,
              event,
            );
            ctx.outbox.publish(resEvent);
          }
        } else {
          const resEvent = responseEvent(
            'submarine-swap-error',
            await urlxRes.text(),
            event,
          );
          ctx.outbox.publish(resEvent);
        }
        break;
      }
      default: {
        const resEvent = responseEvent(
          'submarine-swap-error',
          'Token not supported',
          event,
        );
        ctx.outbox.publish(resEvent);
      }
    }
  };
}

export { filter, getHandler };
