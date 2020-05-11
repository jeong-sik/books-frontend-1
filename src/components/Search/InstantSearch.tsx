import React, {
  useState, useEffect, useCallback, useContext,
} from 'react';
import { css, keyframes } from '@emotion/core';
import ArrowLeft from 'src/svgs/Arrow_Left_13.svg';
import Lens from 'src/svgs/Lens.svg';
import Clear from 'src/svgs/Clear.svg';
import { RIDITheme, ZIndexLayer } from 'src/styles';
import { useDebouncedCallback } from 'use-debounce';
import localStorageKeys from 'src/constants/localStorage';
import * as labels from 'src/labels/instantSearch.json';
import { isOnsetNucleusCoda } from 'src/utils/hangle';
import { safeJSONParse } from 'src/utils/common';
import axios from 'axios';
import InstantSearchResult from 'src/components/Search/InstantSearchResult';
import InstantSearchHistory from 'src/components/Search/InstantSearchHistory';
import { BreakPoint, orBelow } from 'src/utils/mediaQuery';
import pRetry from 'p-retry';
import sentry from 'src/utils/sentry';
import styled from '@emotion/styled';
import { useTheme } from 'emotion-theming';
import { GNBContext } from 'src/components/GNB';
import * as SearchTypes from 'src/types/searchResults';

import { slateGray60 } from '@ridi/colors';
import { Switch } from 'src/components/Switch/Switch';
import Cookies from 'universal-cookie';
import { useRouter } from 'next/router';
import { SearchResult } from './types';

const fadeIn = keyframes`
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
`;

const placeHolderCSS = css`
  opacity: 1;
  font-size: 16px;
  height: 19px;
  line-height: 19px;
  font-weight: 500;
`;

const SearchWrapper = styled.div<{}, RIDITheme>`
  font-size: 16px;
  background-color: #ffffff;
  box-sizing: border-box;
  min-width: 340px;
  border-radius: 3px;
  height: 32px;
  line-height: 32px;
  ${orBelow(
    BreakPoint.LG,
    `
      height: 36px;
      line-height: 36px;
      min-width: unset;
      width: 100%;
    `,
  )};
  outline: none;
  form {
    width: 100%;
  }

  input {
    flex-shrink: 0;
    position: relative;
    padding-right: 3.75px; // 4 * 0.9375
    width: 98%;
    font-size: 16px;
    outline: none;
    transform: scale(0.9375);
    transform-origin: top left;
    font-weight: 500;
    color: #000000;
    ::placeholder {
      ${placeHolderCSS};
      color: ${(props) => props.theme.input.placeholder};
    }
    ::-moz-placeholder {
      ${placeHolderCSS};
      color: ${(props) => props.theme.input.placeholder};
    }
    :-moz-placeholder {
      ${placeHolderCSS};
      color: ${(props) => props.theme.input.placeholder};
    }
  }
  display: flex;
  align-items: center;
`;

const iconStyle = (theme: RIDITheme) => css`
  fill: ${theme.input.placeholder};
  flex-shrink: 0;
  margin: 5.5px 2.5px 5px 7.5px;
  width: 24px;
  height: 24px;
`;

const RemoveSearchButton = styled.button`
  outline: none;
  position: relative;
  right: 10px;
  display: flex;
  align-items: center;
`;

const focused = (theme: RIDITheme) => css`
  order: 2;
  ${orBelow(
    BreakPoint.LG,
    `
      margin-top: 0;
      position: absolute;
      top: 0;
      left: 0;
      z-index: ${ZIndexLayer.LEVEL_9};
      background: ${theme.primaryColor};
      width: 100%;
      padding: 6px;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      order: 3;
    `,
  )};
  @media (max-width: ${BreakPoint.LG}px) {
    animation: ${fadeIn} 0.2s ease-in-out;
  }
`;

const initial = () => css`
  position: relative;
  margin-top: unset;
  outline: unset;
  order: 2;
  ${orBelow(
    BreakPoint.LG,
    `
      margin-top: 10px;
      order: 3;
    `,
  )};
`;

const SearchFooter = styled.div`
  box-sizing: border-box;
  position: absolute;
  background-color: white;
  width: 380px;
  box-shadow: 3px 3px 10px 3px rgba(0, 0, 0, 0.3);
  border-radius: 3px;
  z-index: ${ZIndexLayer.LEVEL_9};
  margin-top: 2px;
  ${orBelow(
    BreakPoint.LG,
    `
      width: 100vw;
      left: 6px;
      box-shadow: unset;
      margin-left: -6px;
      top: 48px;
      margin-top: unset;
      border-radius: 0;
    `,
  )};
  // ie11
  @media (max-width: 999px) and (-ms-high-contrast: none), (-ms-high-contrast: active) {
    top: 46px;
  }
`;

const Dimmer = styled.div`
  display: none;
  ${orBelow(
    BreakPoint.LG,
    `
      display: block;
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: ${ZIndexLayer.LEVEL_8};
      background: rgba(0, 0, 0, 0.5);
    `,
  )};
`;

const ArrowLeftIcon = styled(ArrowLeft)`
  display: none;
  cursor: pointer;
  fill: white;
  width: 16px;
  height: 16px;
  ${orBelow(
    BreakPoint.LG,
    'display: block;',
  )};
`;

const ArrowWrapperButton = styled.button`
  display: none;
  ${orBelow(
    BreakPoint.LG,
    `
      display: block;
      padding: 0 11px 0 5px;
    `,
  )};
`;

const AdultExcludeButton = styled.button`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 9px 16px;
  margin-bottom: 4px;
  width: 100%;
  height: 44px;
  outline: none;
  :active {
    background: rgba(0, 0, 0, 0.05);
  }
`;

const AdultExcludeLabel = styled.span`
  font-weight: bold;
  font-size: 13px;
  color: ${slateGray60};
`;

interface InstantSearchProps {
  searchKeyword: string;
}

const initialSearchResult = {
  books: [],
  authors: [],
};

export const InstantSearch: React.FC<InstantSearchProps> = React.memo(
  (props: InstantSearchProps) => {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const listWrapperRef = React.useRef<HTMLDivElement>(null);
    const theme = useTheme<RIDITheme>();
    const router = useRouter();
    const [isLoaded, setLoaded] = useState(false);
    const [isFocused, setFocus] = useState(false);
    const [keyword, setKeyword] = useState<string>(props.searchKeyword);
    const [searchHistory, setSearchHistory] = useState<string[]>([]);
    const [enableSearchHistoryRecord, toggleSearchHistoryRecord] = useState(true);
    const [focusedPosition, setFocusedPosition] = useState(0);
    const [, setFetching] = useState(false);
    const [isAdultExclude, setAdultExclude] = useState(router.query.adult_exclude === 'y' ?? false);

    const [searchResult, setSearchResult] = useState<SearchResult>(
      initialSearchResult,
    );

    const { origin } = useContext(GNBContext);

    const handleSearch = useCallback(async (value: string, option?: { adultExclude: boolean }) => {
      setFetching(true);
      if (value.trim().length < 1) {
        setFetching(false);
        return;
      }
      const cookie = new Cookies();
      const adultExclude = cookie.get('adult_exclude');
      try {
        const url = new URL('/search', process.env.NEXT_STATIC_SEARCH_API);
        url.searchParams.append('site', 'ridi-store');
        url.searchParams.append('where', 'book');
        url.searchParams.append('where', 'author');
        url.searchParams.append('what', 'instant');
        url.searchParams.append('keyword', value);
        if (option?.adultExclude || adultExclude === 'y') {
          url.searchParams.set('adult_exclude', 'y');
        }

        const result = await pRetry(() => axios.get(url.toString()), { retries: 2 });
        const data = SearchTypes.checkInstantSearchResult(result.data);
        setSearchResult({
          books: data.book.books ?? [],
          authors: data.author.authors ?? [],
        });
      } catch (error) {
        setSearchResult(initialSearchResult);
        setFocusedPosition(0);
        sentry.captureException(error);
      } finally {
        setFetching(false);
      }
    }, [isAdultExclude]);
    const [debouncedHandleSearch] = useDebouncedCallback(handleSearch, 300);

    const handleOnChange = useCallback(
      (value: string) => {
        // 초-중-종성 체크
        if (value.length > 0) {
          if (value.length === 1 && isOnsetNucleusCoda(value[0])) {
            setSearchResult(initialSearchResult);
          } else {
            debouncedHandleSearch(value);
          }
        } else {
          setSearchResult(initialSearchResult);
          debouncedHandleSearch(value);
        }
        setFocusedPosition(0);
      },
      [debouncedHandleSearch],
    );
    const [debouncedOnChange] = useDebouncedCallback(handleOnChange, 100, {});
    const passEventTarget = (e: React.ChangeEvent<HTMLInputElement>) => {
      const copiedValue = e.target.value;
      setKeyword(copiedValue);
      debouncedOnChange(copiedValue);
    };

    const handleSearchWrapperBlur = useCallback((e: React.FocusEvent<HTMLDivElement>) => {
      const relatedTarget = e.relatedTarget || document.activeElement; // IE11
      if (!relatedTarget || !e.currentTarget.contains(relatedTarget as Element)) {
        setFocus(false);
        setFocusedPosition(0);
      }
    }, []);

    const handleToggleSearchHistoryRecord = useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        localStorage.setItem(
          localStorageKeys.instantSearchHistoryOption,
          JSON.stringify(!enableSearchHistoryRecord),
        );
        toggleSearchHistoryRecord(!enableSearchHistoryRecord);
        setFocusedPosition(0);
      },
      [enableSearchHistoryRecord, toggleSearchHistoryRecord],
    );

    const handleRemoveHistory = useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        const label = e.currentTarget.getAttribute('data-value');
        if (label) {
          const historySet = new Set<string>([...searchHistory]);
          historySet.delete(label);
          const newHistory: string[] = Array<string>(...historySet);
          setSearchHistory(newHistory);
          // setFocusedPosition(0);
          localStorage.setItem(
            localStorageKeys.instantSearchHistory,
            JSON.stringify(newHistory.slice(0, 10)),
          );
        }
      },
      [searchHistory],
    );

    const handleClearInput = useCallback(
      (e) => {
        e.preventDefault();
        if (inputRef.current) {
          inputRef.current.value = '';
          setKeyword('');
          inputRef.current.focus();
        }
      },
      [inputRef],
    );

    const handleClearHistory = useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        if (enableSearchHistoryRecord) {
          localStorage.setItem(localStorageKeys.instantSearchHistory, JSON.stringify([]));
          setSearchHistory([]);
          setFocusedPosition(0);
        }
      },
      [enableSearchHistoryRecord],
    );

    const handleClickHistoryItem = useCallback(
      (e: React.MouseEvent<HTMLElement>) => {
        e.preventDefault();
        const label = e.currentTarget.getAttribute('data-value');
        if (label) {
          setKeyword(label);
          setFocus(false);
          setSearchResult(initialSearchResult);

          const url = new URL('/search/', origin || location.href);
          url.searchParams.append('q', label);

          window.location.href = url.toString();
        }
      },
      [],
    );

    const handleClickBookItem = useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        const { bookId } = e.currentTarget.dataset;

        const url = new URL(`/books/${bookId}`, origin || location.href);
        url.searchParams.append('_s', 'instant');
        url.searchParams.append('_q', keyword);

        window.location.href = url.toString();
        setFocus(false);
      },
      [keyword],
    );
    const handleClickAuthorItem = useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        const { authorId } = e.currentTarget.dataset;
        const url = new URL(`/author/${authorId}`, origin || location.href);
        url.searchParams.append('_s', 'instant');
        url.searchParams.append('_q', keyword);

        window.location.href = url.toString();
        setFocus(false);
      },
      [keyword],
    );

    const focusedWithSearch = () => {
      setFocus(true);
      const cookie = new Cookies();
      setAdultExclude(() => cookie.get('adult_exclude') === 'y');
      debouncedHandleSearch(keyword, { adultExclude: cookie.get('adult_exclude') === 'y' });
    };

    const handleSubmit = useCallback(
      (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (keyword.length > 0) {
          if (enableSearchHistoryRecord) {
            const newHistory = Array<string>(
              ...new Set<string>([keyword, ...searchHistory]),
            ).slice(0, 10);
            setSearchHistory(newHistory);
            localStorage.setItem(
              localStorageKeys.instantSearchHistory,
              JSON.stringify(newHistory),
            );
          }
          // Move search result page
          // Todo conditional check for partial component

          const url = new URL('/search/', origin || location.href);
          url.searchParams.append('q', keyword);

          window.location.href = url.toString();

          setFocus(false);
          if (inputRef.current) {
            inputRef.current.blur();
          }
        }
      },
      [keyword, enableSearchHistoryRecord, searchHistory],
    );

    const handleSetCurrentPosition = useCallback((pos: number) => {
      setFocusedPosition(pos);
      if (pos === 0 && inputRef.current) {
        inputRef.current.focus();
      }
    }, []);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent | KeyboardEvent) => {
        if (!inputRef.current) {
          return;
        }
        if (e.which === 13 && e.target) {
          (e.target as HTMLLIElement).click();
        }
        if (e.which === 40 || e.which === 38) {
          e.preventDefault();

          const history = safeJSONParse(
            window.localStorage.getItem(localStorageKeys.instantSearchHistory),
            [],
          ).slice(0, 5);
          const total = inputRef.current.value.length < 1
            ? history.length
            : searchResult.authors.length + searchResult.books.length;
          if (e.which === 40) {
            // keyDown
            const nextPos = focusedPosition + 1;
            const pos = nextPos > total ? 0 : nextPos;
            handleSetCurrentPosition(pos);
          } else {
            const prevPos = focusedPosition - 1;
            const pos = prevPos < 0 ? total : prevPos;
            handleSetCurrentPosition(pos);
          }
        }
      },
      [
        handleSetCurrentPosition,
        focusedPosition,
        searchResult.authors.length,
        searchResult.books.length,
      ],
    );

    const toggleAdultExclude = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      setAdultExclude((value) => !value);
      const cookie = new Cookies();
      const value = !isAdultExclude ? 'y' : 'n';
      cookie.set('adult_exclude', value, {
        path: '/',
        sameSite: 'lax',
      });
      handleSearch(keyword, { adultExclude: !isAdultExclude });
    };

    useEffect(() => {
      toggleSearchHistoryRecord(
        safeJSONParse(
          window.localStorage.getItem(localStorageKeys.instantSearchHistoryOption),
          true,
        ),
      );
      const history = safeJSONParse(
        window.localStorage.getItem(localStorageKeys.instantSearchHistory),
        [],
      );

      setSearchHistory(Array<string>(...new Set<string>(history)));

      if (inputRef.current) {
        setLoaded(true);

        // 검색어 query string 있을 경우 업데이트
        if (location.pathname.startsWith('/search')) {
          const searchParams = new URLSearchParams(window.location.search);
          setKeyword(searchParams.get('q') ?? '');
        }
      }

      return () => {
        // Unmount
      };
    }, []);

    const showFooter = React.useMemo(
      () =>
        // eslint-disable-next-line
        ((keyword.length < 1 && searchHistory.length > 0) ||
          searchResult.books.length > 0
          || searchResult.authors.length > 0)
        && isFocused,
      [
        isFocused,
        keyword.length,
        searchHistory.length,
        searchResult.authors.length,
        searchResult.books.length,
      ],
    );

    return (
      <>
        <div
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          tabIndex={0}
          onBlur={handleSearchWrapperBlur}
          css={[
            isFocused ? focused(theme) : initial(),
            css`
              outline: none;
              ${orBelow(BreakPoint.LG, 'width: 100%;')}
            `,
          ]}
        >
          {isFocused && (
            // eslint-disable-next-line react/jsx-no-bind
            <ArrowWrapperButton onClick={setFocus.bind(null, false)}>
              <ArrowLeftIcon />
              <span className="a11y">{labels.goBack}</span>
            </ArrowWrapperButton>
          )}
          <SearchWrapper>
            <Lens
              css={css`
                ${iconStyle(theme)};
                opacity: ${isFocused ? 1 : 0.6};
              `}
            />
            <form onSubmit={handleSubmit} autoComplete="off">
              <input
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                disabled={!isLoaded}
                aria-label={labels.searchPlaceHolder}
                aria-required="true"
                defaultValue={keyword}
                ref={inputRef}
                type="text"
                name="instant_search"
                placeholder={labels.searchPlaceHolder}
                onFocus={focusedWithSearch}
                onClick={focusedWithSearch}
                onKeyDown={handleKeyDown}
                onChange={passEventTarget}
              />
            </form>
            {keyword.length > 0 && isFocused && (
              <RemoveSearchButton
                onClick={handleClearInput}
              >
                <Clear
                  css={css`
                    width: 14px;
                    height: 14px;
                  `}
                />
                <span className="a11y">모두 지우기</span>
              </RemoveSearchButton>
            )}
          </SearchWrapper>
          {showFooter && (
            <SearchFooter ref={listWrapperRef}>
              <form>
                {keyword.length < 1 && searchHistory.length > 0 ? (
                  <InstantSearchHistory
                    searchHistory={searchHistory}
                    enableSearchHistoryRecord={enableSearchHistoryRecord}
                    handleClickHistoryItem={handleClickHistoryItem}
                    handleClearHistory={handleClearHistory}
                    handleRemoveHistory={handleRemoveHistory}
                    handleToggleSearchHistoryRecord={handleToggleSearchHistoryRecord}
                    handleKeyDown={handleKeyDown}
                    focusedPosition={focusedPosition}
                  />
                ) : (
                  <>
                    <InstantSearchResult
                      handleKeyDown={handleKeyDown}
                      handleClickBookItem={handleClickBookItem}
                      handleClickAuthorItem={handleClickAuthorItem}
                      focusedPosition={focusedPosition}
                      result={searchResult}
                    />
                    <AdultExcludeButton onClick={toggleAdultExclude}>
                      <AdultExcludeLabel>성인 제외</AdultExcludeLabel>
                      <Switch checked={isAdultExclude} />
                    </AdultExcludeButton>
                  </>
                )}
              </form>
            </SearchFooter>
          )}
        </div>
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events,jsx-a11y/no-static-element-interactions */}
        {isFocused && <Dimmer onClick={() => setFocus(false)} />}
      </>
    );
  },
);

export default InstantSearch;
