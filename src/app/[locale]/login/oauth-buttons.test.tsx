import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import type { OAuthState } from "./oauth-flow";
const mocks = vi.hoisted(() => ({prepare: vi.fn(), locale: vi.fn(), signIn: vi.fn(), assign: vi.fn(), state: {status:'idle'} as OAuthState}));
vi.mock('next-intl', () => ({useLocale:()=> 'en', useTranslations:()=> (key: string)=>key}));
vi.mock('@/components/site-session-state', () => ({useSiteState:()=> [mocks.state,(value: OAuthState)=>{mocks.state=value;},{active:true,get:()=>mocks.state}]}));
vi.mock('./actions', () => ({prepareLogin:mocks.prepare,updateLoginLocale:mocks.locale}));
vi.mock('@/lib/supabase/client', () => ({createClient:()=>({auth:{signInWithOAuth:mocks.signIn}})}));
import { OAuthButtons } from './oauth-buttons';
// Invoke the real component with modeled hook state, then invoke its actual
// onClick props. No duplicated flow or source-string assertion supplies the lock.
function button(index: number) {
  const tree=OAuthButtons({next:'/console'}) as ReactElement<{children: ReactElement<{onClick:()=>Promise<void>;disabled:boolean}>[]}>;
  return tree.props.children[index+1].props;
}
beforeEach(() => {
  vi.clearAllMocks(); mocks.state={status:'idle'};
  mocks.prepare.mockResolvedValue(undefined); mocks.locale.mockResolvedValue(undefined);
  mocks.signIn.mockResolvedValue({data:{url:'https://provider.example.test'},error:null});
  vi.stubGlobal('window',{location:{href:'https://naeil.example.test/login?next=/console',origin:'https://naeil.example.test',assign:mocks.assign}});
  vi.stubGlobal('document',{documentElement:{lang:'en'}});
});
afterEach(()=>vi.unstubAllGlobals());
it('locks the actual login callbacks across a rerender and navigates once', async () => {
  let release!:()=>void;
  mocks.prepare.mockImplementationOnce(()=>new Promise<void>(done=>{release=done;}));
  const first=button(0).onClick();
  expect(button(0).disabled).toBe(true); expect(button(1).disabled).toBe(true);
  await button(1).onClick();
  expect(mocks.prepare).toHaveBeenCalledTimes(1);
  release(); await first;
  expect(mocks.signIn).toHaveBeenCalledTimes(1);
  expect(mocks.signIn.mock.calls[0][0].provider).toBe('google');
  expect(mocks.assign).toHaveBeenCalledExactlyOnceWith('https://provider.example.test');
});
it.each(['response','throw'])('recovers through the actual other-provider button after %s failure', async mode => {
  if(mode==='throw') mocks.prepare.mockRejectedValueOnce(new Error('private details'));
  else mocks.signIn.mockResolvedValueOnce({data:{url:null},error:new Error('private details')});
  await button(0).onClick();
  expect(mocks.state).toEqual({status:'error'}); expect(button(1).disabled).toBe(false);
  await button(1).onClick();
  expect(mocks.signIn.mock.calls.at(-1)?.[0].provider).toBe('github');
  expect(mocks.assign).toHaveBeenCalledTimes(1);
});
