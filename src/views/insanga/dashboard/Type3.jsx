import React from 'react';

const Type3 = () => {
  return (
    <div className='dashboard-3'>
      <div className='top'>
        <h1 className='title'>고객 충성도 대시보드</h1>
        <p className='text'>충성도 프로그램 성과 및 고객 등급 분석</p>
      </div>
      <div className='summary'>
        <div className='summary-item'>
          <i className='ri-user-smile-line primary' />
          <div className='cont'>
            <label>총 멤버수</label>
            <div className='value'>2.8만</div>
            <div className='change plus'>+12.5%</div>
          </div>
        </div>
        <div className='summary-item'>
          <i className='ri-user-heart-line pink' />
          <div className='cont'>
            <label>활성 멤버</label>
            <div className='value'>1.9만</div>
            <div className='change plus'>+8.3%</div>
          </div>
        </div>
        <div className='summary-item'>
          <i className='ri-parking-fill info' />
          <div className='cont'>
            <label>평균 포인트</label>
            <div className='value'>3.2K</div>
            <div className='change'>-5.7%</div>
          </div>
        </div>
        <div className='summary-item'>
          <i className='ri-award-line teal' />
          <div className='cont'>
            <label>고객 생애 가치</label>
            <div className='value'>₩2,850,000</div>
            <div className='change plus'>+12.5%</div>
          </div>
        </div>
      </div>
      <div className='dash-panel'>
        <div className='panel-title'>충성도 등급별 고객 분포</div>
        <div className='list'>
          <div className='box bronze'>
            <div className='inner-top'>
              <i className='ri-user-settings-fill' />
              <div className='conts'>
                <div className='left'><strong>Bronze</strong><span>신규고객</span></div>
                <div className='right'><strong>45.2%</strong><span>전체고객</span></div>
              </div>
            </div>
            <ul className='info'>
              <li><label>고객수</label><strong>1.3만</strong></li>
              <li><label>포인트범위</label><span>0~999</span></li>
            </ul>
            <h3>혜택</h3>
            <ul className='list-dot'>
              <li>1% 적립</li>
              <li>생일 쿠폰</li>
            </ul>
          </div>
          <div className='box silver'>
            <div className='inner-top'>
              <i className='ri-user-settings-fill' />
              <div className='conts'>
                <div className='left'><strong>Silver</strong><span>웰컴고객</span></div>
                <div className='right'><strong>45.2%</strong><span>전체고객</span></div>
              </div>
            </div>
            <ul className='info'>
              <li><label>고객수</label><strong>1.3만</strong></li>
              <li><label>포인트범위</label><span>1,000~4,999</span></li>
            </ul>
            <h3>혜택</h3>
            <ul className='list-dot'>
              <li>2% 적립</li>
              <li>무료배송</li>
              <li>생일 쿠폰</li>
            </ul>
          </div>
          <div className='box gold'>
            <div className='inner-top'>
              <i className='ri-user-settings-fill' />
              <div className='conts'>
                <div className='left'><strong>Gold</strong><span>VIP고객</span></div>
                <div className='right'><strong>45.2%</strong><span>전체고객</span></div>
              </div>
            </div>
            <ul className='info'>
              <li><label>고객수</label><strong>1.3만</strong></li>
              <li><label>포인트범위</label><span>5,000~9,999</span></li>
            </ul>
            <h3>혜택</h3>
            <ul className='list-dot'>
              <li>3% 적립</li>
              <li>무료배송</li>
              <li>생일 쿠폰</li>
              <li>우선상담</li>
              <li>전용상품</li>
            </ul>
          </div>
          <div className='box platinum'>
            <div className='inner-top'>
              <i className='ri-user-settings-fill' />
              <div className='conts'>
                <div className='left'><strong>Platinum</strong><span>프리미엄고객</span></div>
                <div className='right'><strong>45.2%</strong><span>전체고객</span></div>
              </div>
            </div>
            <ul className='info'>
              <li><label>고객수</label><strong>1.3만</strong></li>
              <li><label>포인트범위</label><span>10,000~999,999</span></li>
            </ul>
            <h3>혜택</h3>
            <ul className='list-dot'>
              <li>5% 적립</li>
              <li>무료배송</li>
              <li>생일쿠폰</li>
              <li>우선상담</li>
              <li>전용상품</li>
              <li>개인상담사</li>
            </ul>
          </div>
        </div>
      </div>
      <div className='dash-panel'>
        <div className='panel-title'>고객 이탈율 분석</div>
        <div style={{ display: 'flex', alignItems: 'stretch', gap: '0 20px' }}>
          <div className='ds-box' style={{ flex: 1, }}>
            <div className='panel-title'>등급별 이탈율</div>
            <ul className='out-list'>
              <li>
                <div className='title'>
                  <h3>Bronze</h3><span>12,500명</span>
                </div>
                <div className='bar bronze'>
                  <div className='line'>
                    <span style={{width: '18.5%'}}></span>
                  </div>
                  <label>18.5%</label>
                </div>
              </li>
              <li>
                <div className='title'>
                  <h3>Silver</h3><span>12,500명</span>
                </div>
                <div className='bar silver'>
                  <div className='line'>
                    <span style={{width: '18.5%'}}></span>
                  </div>
                  <label>18.5%</label>
                </div>
              </li>
              <li>
                <div className='title'>
                  <h3>Gold</h3><span>12,500명</span>
                </div>
                <div className='bar gold'>
                  <div className='line'>
                    <span style={{width: '18.5%'}}></span>
                  </div>
                  <label>18.5%</label>
                </div>
              </li>
              <li>
                <div className='title'>
                  <h3>Platinum</h3><span>12,500명</span>
                </div>
                <div className='bar platinum'>
                  <div className='line'>
                    <span style={{width: '18.5%'}}></span>
                  </div>
                  <label>18.5%</label>
                </div>
              </li>
            </ul>
            <div className='out-total'>
              <dl>
                <dt>전체이탈율</dt>
                <dd className='value'>12%</dd>
                <dd className='change plus'>전월대비 +2.2%</dd>
              </dl>
              <dl>
                <dt>고객유지율</dt>
                <dd className='value'>12%</dd>
                <dd className='change plus'>전월대비 +2.2%</dd>
              </dl>
              <dl>
                <dt>평균고객</dt>
                <dd className='value'>18.5개월</dd>
                <dd className='change'>전월대비 -2.2%</dd>
              </dl>
            </div>
          </div>
          <div className='ds-box' style={{ flex: 1, }}>
            <div className='panel-title'>이탈율 추이(최근 6개월)</div>
            <div className='chart'>
              ...chart
            </div>
          </div>
        </div>
      </div>
      <div className='dash-panel'>
        <div className='panel-title'>포인트 활동 추이</div>
        <div className='ds-box'>
          <div className='chart'>
            ...chart
          </div>
        </div>
      </div>
      <div className='dash-panel'>
        <div className='panel-title'>충성도 프로그램 성과</div>
        <div className='performance'>
          <dl>
            <dt>신규가입자</dt>
            <dd className='value'>3.2K</dd>
            <dd>
              <label>전일대비</label>
              <strong className='change plus'>15.2%</strong>
            </dd>
            <dd className='link'><a href='#'>자세히보기<i className='ri-arrow-right-line' /></a></dd>
          </dl>
          <dl>
            <dt>포인트 적립액</dt>
            <dd className='value'>₩6,800,000</dd>
            <dd>
              <label>전일대비</label>
              <strong className='change'>15.2%</strong>
            </dd>
            <dd className='link'><a href='#'>자세히보기<i className='ri-arrow-right-line' /></a></dd>
          </dl>
          <dl>
            <dt>포인트 사용액</dt>
            <dd className='value'>₩4,600,000</dd>
            <dd>
              <label>전일대비</label>
              <strong className='change plus'>15.2%</strong>
            </dd>
            <dd className='link'><a href='#'>자세히보기<i className='ri-arrow-right-line' /></a></dd>
          </dl>
          <dl>
            <dt>재구매율</dt>
            <dd className='value'>84.2%</dd>
            <dd>
              <label>전일대비</label>
              <strong className='change'>-2.2%</strong>
            </dd>
            <dd className='link'><a href='#'>자세히보기<i className='ri-arrow-right-line' /></a></dd>
          </dl>
          <dl>
            <dt>평균구매주기</dt>
            <dd className='value'>28일</dd>
            <dd>
              <label>전일대비</label>
              <strong className='change'>-5.2%</strong>
            </dd>
            <dd className='link'><a href='#'>자세히보기<i className='ri-arrow-right-line' /></a></dd>
          </dl>
          <dl>
            <dt>고객 생애 가치</dt>
            <dd className='value'>₩2,850,000</dd>
            <dd>
              <label>전일대비</label>
              <strong className='change plus'>15.2%</strong>
            </dd>
            <dd className='link'><a href='#'>자세히보기<i className='ri-arrow-right-line' /></a></dd>
          </dl>
        </div>
      </div>
    </div>
  );
};

export default Type3;