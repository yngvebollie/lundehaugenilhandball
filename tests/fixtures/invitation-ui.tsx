import {createRoot} from 'react-dom/client';
import {InvitationDeliveries} from '../../src/features/beta/invitation-deliveries';
import '../../app/globals.css';
export const demo=false;
export const db={auth:{getSession:async()=>({data:{session:{access_token:'test-only'}}})}};
createRoot(document.getElementById('root')!).render(<main style={{maxWidth:1100,margin:'24px auto',padding:16}}><InvitationDeliveries team="00000000-0000-4000-8000-000000000010" revision={0}/></main>);
