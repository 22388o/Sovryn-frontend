import styled, { css } from 'styled-components';

interface IPieChartProps {
  firstPercentage: number;
  secondPercentage: number;
  thirdPercentage?: number;
}

export const PieChart = styled.div<IPieChartProps>`
  width: 9.375rem;
  height: 9.375rem;
  background: radial-gradient(
      circle closest-side,
      #222222 0,
      #222222 82%,
      transparent 82%,
      transparent 100%,
      #222222 0
    ),
    conic-gradient(
      #e9eae9 0,
      #e9eae9 ${props => props.firstPercentage}%,
      #5aa897 0,
      #5aa897 ${props => props.firstPercentage + props.secondPercentage}%,
      ${props =>
        props.thirdPercentage
          ? css`
      #fec004 0,
      #fec004 100%
      `
          : css`
    #5AA897 100%
    `}
    );
`;

export const MainSection = styled.div`
  background-color: #222222;
  width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
`;

export const Divider = styled.div`
  width: 0px;
  border-width: 1px;
  height: 150px;
  border-color: #e9eae9;
`;

export const StyledBackgroundImageWrapper = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  z-index: 0;
  opacity: 0.25;
  display: flex;
  justify-content: space-between;
  width: 100%;
  max-height: 43rem;
`;

export const MainSectionWrapper = styled.div`
  width: 57.5rem;
`;