import React, { useState } from 'react';

const LayoutType1 = () => {
  const [isExpanded, setExpanded] = useState(true);
  const toggleExpanded = () => {
    setExpanded(isExpanded => !isExpanded);
  };

  return (
    <div className='template-T'>
      <div className='search-filter'>
        <div className='title'><h4>회원조회</h4><i className='ri-reset-left-line primary' /></div>
        <div className='content-query-row'>
          <div className='content-query-item'>
            <label className='content-query-label'>회원번호</label>
            <input type='text' className='content-query-input' />
          </div>
          <div className='content-query-item'>
            <label className='content-query-label'>회원명</label>
            <input type='text' className='content-query-input' />
          </div>
          <div className='content-query-item'>
            <label className='content-query-label'>연락처</label>
            <input type='text' className='content-query-input' />
          </div>
          <div className='content-query-item'>
            <label className='content-query-label'>담당자</label>
            <input type='text' className='content-query-input' />
          </div>
          <div className='content-query-item'>
            <label className='content-query-label'>주소</label>
            <input type='text' className='content-query-input' />
          </div>
        </div>
        <div className='content-search-wrapper'>
          <button type='button' className='content-init-button'>버튼</button>
          <button type='button' className='content-search-button'>버튼</button>
        </div>
      </div>
      <div className='content-main-area'>
        <div className={isExpanded ? 'content-left-panel expanded' : 'content-left-panel'} style={{width : isExpanded ? '40%' : '24px'}}>
          <button type='button' className={isExpanded ? `content-toggle expanded` : `content-toggle`} onClick={()=>toggleExpanded()}>
            <i className='ri-arrow-left-wide-line' />
          </button>
          <div className='content-top-button'>
            <button type='button' className='content-init-button'>버튼</button>
            <button type='button' className='content-search-button'>버튼</button>
          </div>
          <h3 className='content-panel-title'>고객검색</h3>
          <div className='content-sidebar-content'>
            검색결과(마스터)
          </div>
        </div>
        <div className='content-center-panel'>
          <div className='content-tab'>
            <button type='button' className='content-tab-button active'>TAB1</button>
            <button type='button' className='content-tab-button'>TAB2</button>
          </div>
          <h3 className='content-panel-title'>고객상세</h3>
          <div className='content-sidebar-content'>
            검색결과(디테일)
          </div>
        </div>
      </div>
    </div>
  );
};

export default LayoutType1;