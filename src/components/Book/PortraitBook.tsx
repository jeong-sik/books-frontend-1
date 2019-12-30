import styled from '@emotion/styled';
import { BreakPoint, orBelow } from 'src/utils/mediaQuery';
import { css } from '@emotion/core';

export const PortraitBook = styled.li`
  display: flex;
  flex-direction: column;
  box-sizing: content-box;
  min-width: 140px;
  width: 140px;

  :first-of-type {
    margin-right: 23px;
  }
  :last-of-type {
    padding-right: 20px;
  }
  :not(:last-of-type) {
    margin-right: 23px;
  }

  ${orBelow(
    BreakPoint.LG,
    css`
      min-width: 100px;
      width: 100px;
      :first-of-type {
        //padding-left: 16px;
      }
      :last-of-type {
        padding-right: 24px;
      }
      :not(:last-of-type) {
        margin-right: 12px;
      }
    `,
  )}
`;

export const RecommendedPortraitBook = styled.li`
  display: flex;
  flex-direction: column;
  box-sizing: content-box;
  min-width: 140px;
  width: 140px;

  :first-of-type {
    margin-right: 22px;
  }
  :last-of-type {
    padding-right: 20px;
  }
  :not(:last-of-type) {
    margin-right: 22px;
  }

  ${orBelow(
    BreakPoint.LG,
    css`
      min-width: 100px;
      width: 100px;
      :first-of-type {
        //padding-left: 16px;
      }
      :last-of-type {
        padding-right: 24px;
      }
      :not(:last-of-type) {
        margin-right: 12px;
      }
    `,
  )}
`;
