import React, { useEffect, useRef } from 'react';
import { AssetRenderer } from '../AssetRenderer';
import { AssetSelectItemWrapper } from './styled';
import { Asset } from 'types/asset';
import { useDetectOutsideClick } from './hooks/useClickedOutside';
const assets: Array<Asset> = [
  Asset.RBTC,
  Asset.SOV,
  Asset.XUSD,
  Asset.ETH,
  Asset.BNB,
];

interface AssetListProps {
  selected: Asset;
  onSelect?: (asset: Asset) => void;
}

export const AssetList: React.FC<AssetListProps> = ({ selected, onSelect }) => {
  const wrapperRef = useRef(null);
  const outsideClicked = useDetectOutsideClick(wrapperRef);
  useEffect(() => {
    if (outsideClicked && onSelect && typeof onSelect === 'function') {
      onSelect(selected);
    }
  }, [selected, onSelect, outsideClicked]);
  return (
    <ul className="tw-bg-white tw-rounded-lg" ref={wrapperRef}>
      {assets.map((asset, i) => (
        <AssetSelectItemWrapper
          className="tw-px-3 tw-py-1 tw-text-black"
          onClick={() =>
            typeof onSelect === 'function' ? onSelect(asset) : {}
          }
          key={i}
        >
          <AssetRenderer
            assetClassName="tw-text-lg tw-font-rowdies"
            asset={asset}
          />
        </AssetSelectItemWrapper>
      ))}
    </ul>
  );
};
