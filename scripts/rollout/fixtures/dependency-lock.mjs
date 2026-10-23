// A pnpm v9 file-tarball resolution with a peer-suffixed snapshot.
export function dependencyLock(version = '0.7.0', integrity = 'sha512-before') {
  return `lockfileVersion: '9.0'

settings:
  autoInstallPeers: true
  excludeLinksFromLockfile: false

importers:

  .:
    dependencies:
      '@naeil/ui':
        specifier: file:vendor/naeil-ui-${version}.tgz
        version: file:vendor/naeil-ui-${version}.tgz(react@19.2.3)
      react:
        specifier: 19.2.3
        version: 19.2.3

packages:

  '@naeil/ui@file:vendor/naeil-ui-${version}.tgz':
    resolution: {integrity: ${integrity}, tarball: file:vendor/naeil-ui-${version}.tgz}
    version: ${version}
    peerDependencies:
      react: ^19

  react@19.2.3:
    resolution: {integrity: sha512-react-fixture}
    engines: {node: '>=0.10.0'}

snapshots:

  '@naeil/ui@file:vendor/naeil-ui-${version}.tgz(react@19.2.3)':
    dependencies:
      react: 19.2.3

  react@19.2.3: {}
`;
}
