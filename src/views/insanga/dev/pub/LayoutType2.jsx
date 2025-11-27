import React, { useState } from 'react';

const LayoutType2 = () => {
  const [isExpanded, setExpanded] = useState(true);
  const toggleExpanded = () => {
    setExpanded(isExpanded => !isExpanded);
  };
  return (
    <div className='template-T'>
      <div className='search-filter'>
        <div className='content-query-row'>
          <div className='content-query-item'>
            <label className='content-query-label'>검색조건</label>
            <input type='text' className='content-query-input' />
          </div>
        </div>
        <div className='content-search-wrapper'>
          <button type='button' className='content-init-button'>초기화</button>
          <button type='button' className='content-search-button'>검색</button>
        </div>
      </div>
      <div className='content-main-area'>
        <div className={isExpanded ? 'content-left-panel expanded' : 'content-left-panel'} style={{width : isExpanded ? '40%' : '24px'}}>
          <button type='button' className={isExpanded ? `content-toggle expanded` : `content-toggle`} onClick={()=>toggleExpanded()}>
            <i className='ri-arrow-left-wide-line' />
          </button>
          <div className='content-top-button'>
            <button type='button' className='content-save-button'>신규등록</button>
          </div>
          <h3 className='content-panel-title'>고객검색</h3>
          <div className='content-sidebar-content'>
            ....검색
          </div>
        </div>
        <div className='content-center-panel'>
          <div className='content-center-top'>
            <div className='left'>
              <button type='button' className='content-search-button'>회원정보</button>
              <button type='button' className='content-init-button'>문자발송내역</button>
              <button type='button' className='content-init-button'>.....</button>
            </div>
            <div className='right'>
              <button type='button' className='content-save-button'>신규등록</button>
              <button type='button' className='content-save-button'>주문결제</button>
            </div>
          </div>
          <div className='content-center-content'>
            <h3 className='content-panel-title'>기본정보</h3>
            <div className='content-sidebar-content'>...</div>
          </div>
          <div className='content-center-content'>
            <h3 className='content-panel-title'>추가정보</h3>
            <div className='content-sidebar-content'>...</div>
          </div>
          <div className='content-center-content'>
            <div className='content-center-top'>
              <div className='left'>
                <button type='button' className='content-search-button'>상담</button>
                <button type='button' className='content-init-button'>주문간편조회</button>
                <button type='button' className='content-init-button'>.....</button>
              </div>
              <div className='right'>
                <button type='button' className='content-save-button'>SMS발송</button>
                <button type='button' className='content-save-button'>배송지조회</button>
              </div>
            </div>            
            <h3 className='content-panel-title'>상담이력</h3>
            <div className='content-sidebar-content'>...</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LayoutType2;