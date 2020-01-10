import { DisplayType, MdBook, SectionExtra } from 'src/types/sections';
import SelectionBook from 'src/components/BookSections/SelectionBook/SelectionBook';
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from 'src/store/config';
import axios, { OAuthRequestType } from 'src/utils/axios';
import sentry from 'src/utils/sentry';
import { keyToArray } from 'src/utils/common';
import { booksActions } from 'src/services/books';
import { categoryActions } from 'src/services/category';
import { useRouter } from 'next/router';

const { captureException } = sentry();

interface AiRecommendationSectionProps {
  items?: MdBook[];
  genre: string;
  type: DisplayType;
  extra: SectionExtra;
  title: string;
  slug: string;
}

const AiRecommendationSection: React.FC<AiRecommendationSectionProps> = props => {
  const { loggedUser } = useSelector((store: RootState) => store.account);
  const dispatch = useDispatch();
  const { items, type, title, extra, slug } = props;
  const [aiItems, setSections] = useState(items || []);
  const [isRequestError, setIsRequestError] = useState(false);

  const router = useRouter();
  const genre = (router.query.genre as string) || 'general';

  useEffect(() => {
    // @ts-ignore
    const requestAiRecommendationItems = async () => {
      try {
        const requestUrl = new URL(
          `/sections/home-${genre}-ai-recommendation/`,
          publicRuntimeConfig.STORE_API,
        );
        const result = await axios.get(requestUrl.toString(), {
          withCredentials: true,
          custom: { authorizationRequestType: OAuthRequestType.CHECK },
          timeout: 8000,
        });
        if (result.status < 400 && result.status >= 200) {
          setSections(result.data.items.map(item => ({ ...item, excluded: false })));
          const bIds = keyToArray(result.data.items, 'b_id');
          dispatch({ type: booksActions.insertBookIds.type, payload: bIds });
          const categoryIds = keyToArray(result.data.items, 'category_id');
          dispatch({
            type: categoryActions.insertCategoryIds.type,
            payload: categoryIds,
          });
          setIsRequestError(false);
        } else {
          setIsRequestError(true);
        }
      } catch (error) {
        setIsRequestError(true);
        captureException(error);
      }
    };

    if (aiItems.length < 1 && loggedUser && !isRequestError) {
      if (
        [
          'bl',
          'bl-serial',
          'fantasy',
          'fantasy-serial',
          'comics',
          'romance',
          'romance-serial',
          'general',
        ].includes(genre)
      ) {
        requestAiRecommendationItems();
      }
    }
  }, [dispatch, genre, router, aiItems.length, items, loggedUser, isRequestError]);
  if (!loggedUser || !aiItems || aiItems.length < 1) {
    return null;
  }
  // https://app.asana.com/0/1152363431499050/1153588050414697
  if (aiItems.length < 6) {
    return null;
  }
  if (isRequestError) {
    return null;
  }
  return (
    <SelectionBook
      items={aiItems || []}
      slug={`${slug}-ai-rcmd`}
      title={loggedUser ? `${loggedUser.id} ${title}` : 'AI 추천'}
      extra={extra}
      genre={genre}
      type={type}
      option={{ isAIRecommendation: true }}
    />
  );
};

export default AiRecommendationSection;
