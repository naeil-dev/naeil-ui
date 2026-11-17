export default async function Page() {
  await new Promise(resolve => setTimeout(resolve, 150));
  return <main><h1>Streamed theme content</h1><p>The first background must match the chosen theme.</p></main>;
}
