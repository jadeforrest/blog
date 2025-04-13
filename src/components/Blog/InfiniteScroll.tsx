/* This file is forked from https://github.com/jaredpalmer/react-simple-infinite-scroll
   Authors: Jared Palmer, Pablo Garcia
   Modified by Baobab Koodaa.
*/

import React, { Component, ReactNode, RefObject, createRef } from 'react';
import throttle from 'lodash.throttle';

export interface InfiniteScrollProps {
  /**
   * Does the resource have more entities
   */
  hasMore: boolean;

  /**
   * Should show loading
   */
  isLoading: boolean;

  /**
   * Callback to load more entities
   */
  onLoadMore: () => void;

  /**
   * Scroll threshold
   */
  threshold?: number;

  /**
   * Throttle rate
   */
  throttle?: number;

  /** Children */
  children?: ReactNode;

  /**
   * Callback for convenient inline rendering and wrapping
   */
  render?: (props: { sentinel: JSX.Element; children: ReactNode }) => JSX.Element;

  /**
   * A React component to act as wrapper
   */
  component?: React.ComponentType<{ sentinel: JSX.Element; children?: ReactNode }>;
}

export class InfiniteScroll extends Component<InfiniteScrollProps> {
  public static defaultProps: Pick<InfiniteScrollProps, 'threshold' | 'throttle'> = {
    threshold: 100,
    throttle: 64,
  };

  private sentinelRef: RefObject<HTMLDivElement> = createRef();
  private scrollHandler: () => void;
  private resizeHandler: () => void;

  componentDidMount(): void {
    this.scrollHandler = throttle(this.checkWindowScroll, this.props.throttle);
    this.resizeHandler = throttle(this.checkWindowScroll, this.props.throttle);

    window.addEventListener('scroll', this.scrollHandler);
    window.addEventListener('resize', this.resizeHandler);
  }

  componentWillUnmount(): void {
    window.removeEventListener('scroll', this.scrollHandler);
    window.removeEventListener('resize', this.resizeHandler);
  }

  componentDidUpdate(): void {
    // This fixes edge case where initial content is not enough to enable scrolling on a large screen.
    this.checkWindowScroll();
  }

  checkWindowScroll = (): void => {
    if (this.props.isLoading) {
      return;
    }

    if (
      this.props.hasMore &&
      this.sentinelRef.current &&
      this.sentinelRef.current.getBoundingClientRect().top - window.innerHeight <
      this.props.threshold!
    ) {
      this.props.onLoadMore();
    }
  }

  render(): JSX.Element {
    const sentinel = <div ref={this.sentinelRef} />;

    if (this.props.render) {
      return this.props.render({
        sentinel,
        children: this.props.children
      });
    }

    if (this.props.component) {
      const Container = this.props.component;
      return (
        <Container sentinel={sentinel}>
          {this.props.children}
        </Container>
      );
    }

    return (
      <div>
        {this.props.children}
        {sentinel}
      </div>
    );
  }
}

export default InfiniteScroll;