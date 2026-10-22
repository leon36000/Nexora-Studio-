// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import {
  clearDependentsOnRemap,
  type ForkReferenceResolver,
  remapForkSubBlocks,
  type SubBlockTransform,
} from '@/lib/workflows/references/remap-references'

/**
 * The fork-create (bootstrap) sub-block transform, built only from the core remapper.
 *
 * Workspace forking is disabled in this edition, so nothing in the product calls this today; it is
 * kept as the pure core-policy composition the core tests describe: `remapForkSubBlocks` in
 * `'create'` mode (unresolved references are cleared), where every resolved target is a COPY of
 * its source (a bootstrap copies resources), so copy-faithful dependents such as a document under
 * a copied knowledge base or a column under a copied table survive `clearDependentsOnRemap`.
 */
export function createForkBootstrapTransform(resolve: ForkReferenceResolver): SubBlockTransform {
  const isCopiedTarget = () => true
  return (
    subBlocks,
    blockType,
    canonicalModes,
    onCanonicalModesChanged,
    triggerMode,
    preserveToolIndices
  ) => {
    const result = remapForkSubBlocks(subBlocks, resolve, 'create', {
      blockType,
      canonicalModes,
      triggerMode,
      preserveToolIndices,
      isCopiedTarget,
    })
    if (result.canonicalModes) onCanonicalModesChanged?.(result.canonicalModes)
    return clearDependentsOnRemap(
      result.subBlocks,
      blockType,
      result.remappedKeys,
      result.canonicalModes ?? canonicalModes,
      result.copyRemappedKeys,
      triggerMode
    )
  }
}
