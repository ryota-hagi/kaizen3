import { NextRequest, NextResponse } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';
import { Employee, WorkflowStep } from '../../../utils/api';

// Anthropic APIクライアントの初期化
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export async function POST(request: NextRequest) {
  try {
    // リクエストボディの解析
    const body = await request.json();
    const { message, companyInfo, employees, workflowContext } = body;
    
    console.log('=== DEBUG INFO ===');
    console.log('Request Body:', JSON.stringify(body, null, 2));
    console.log('Company Info Type:', companyInfo ? typeof companyInfo : 'undefined');
    console.log('Company Info:', JSON.stringify(companyInfo, null, 2));
    console.log('Employees Type:', employees ? typeof employees : 'undefined');
    console.log('Employees:', JSON.stringify(employees, null, 2));
    console.log('Workflow Context Type:', workflowContext ? typeof workflowContext : 'undefined');
    console.log('Workflow Context:', JSON.stringify(workflowContext, null, 2));

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // システムプロンプトの構築
    let systemPrompt = `あなたは業務改善AIアシスタント「Kaizen」です。
ユーザーの業務改善を支援することが役割です。
回答は簡潔にしてください。`;

    // ユーザーメッセージの構築
    let userMessage = message;

    // コンテキスト情報の追加
    let contextInfo = '';

// 会社情報の追加
console.log('Adding Company Info to Context:', companyInfo);
if (companyInfo && typeof companyInfo === 'object') {
  try {
    // companyInfoの内容を詳細にログ出力
    console.log('Company Info Details:');
    console.log('- name:', companyInfo.name);
    console.log('- industry:', companyInfo.industry);
    console.log('- businessDescription:', companyInfo.businessDescription);
    console.log('- size:', companyInfo.size);
    console.log('- address:', companyInfo.address);
    
    // 会社情報をコンテキストに追加
    contextInfo += `\n\n【会社情報】
会社名: ${companyInfo.name || '未設定'}
業種: ${companyInfo.industry || '未設定'}
事業内容: ${companyInfo.businessDescription || '未設定'}
規模: ${companyInfo.size || '未設定'}
所在地: ${companyInfo.address || '未設定'}`;
    console.log('Added Company Info to Context:', contextInfo);
  } catch (error) {
    console.error('Error adding company info to context:', error);
    // エラーが発生した場合でもデフォルト値を設定
    contextInfo += `\n\n【会社情報】
会社名: 株式会社サンプル
業種: IT
事業内容: ビジネスプロセス改善ソリューションの提供
規模: 50-100人
所在地: 東京都渋谷区`;
    console.log('Using default company info in context due to error');
  }
} else {
  console.log('No valid company info provided, using default');
  // 会社情報がない場合はデフォルト値を設定
  contextInfo += `\n\n【会社情報】
会社名: 株式会社サンプル
業種: IT
事業内容: ビジネスプロセス改善ソリューションの提供
規模: 50-100人
所在地: 東京都渋谷区`;
}

    // 従業員情報の追加
    console.log('Adding Employee Info to Context:', employees);
    if (employees && employees.length > 0) {
      try {
        contextInfo += `\n\n【従業員情報】`;
        employees.forEach((emp: Employee) => {
          contextInfo += `\n- ${emp.name || '名前未設定'} (${emp.position || '役職未設定'}, ${emp.department || '部署未設定'}, 時給: ${emp.hourlyRate || 0}円)`;
        });
        console.log('Added Employee Info to Context');
      } catch (error) {
        console.error('Error adding employee info to context:', error);
        // エラーが発生した場合でもデフォルト値を設定
        contextInfo += `\n\n【従業員情報】
- 山田太郎 (営業部長, 営業部, 時給: 3000円)
- 佐藤花子 (経理担当, 管理部, 時給: 2500円)`;
        console.log('Using default employee info in context');
      }
    } else {
      console.log('No employee info provided');
    }

    // ワークフロー情報の追加
    console.log('Adding Workflow Context to Context:', workflowContext);
    if (workflowContext) {
      try {
        contextInfo += `\n\n【現在の業務フロー情報】
ID: ${workflowContext.id || '未設定'}
名前: ${workflowContext.name || '未設定'}
説明: ${workflowContext.description || '未設定'}
改善済み: ${workflowContext.isImproved ? 'はい' : 'いいえ'}`;

        if (workflowContext.originalId) {
          contextInfo += `\n元のフローID: ${workflowContext.originalId}`;
        }

        if (workflowContext.steps && workflowContext.steps.length > 0) {
          contextInfo += `\n\n【現在のフローのステップ情報】`;
          workflowContext.steps.forEach((step: WorkflowStep, index: number) => {
            contextInfo += `\n${index + 1}. ${step.title || '未設定'}
   - 説明: ${step.description || '未設定'}
   - 担当: ${step.assignee || '未設定'}
   - 所要時間: ${step.timeRequired || 0}分`;
          });
        }

        // 関連するワークフロー情報の追加
        console.log('Related Workflow:', workflowContext.relatedWorkflow);
        console.log('Related Workflow Type:', workflowContext.relatedWorkflow ? typeof workflowContext.relatedWorkflow : 'undefined');
        if (workflowContext.relatedWorkflow) {
          console.log('Related Workflow Keys:', Object.keys(workflowContext.relatedWorkflow));
          console.log('Related Workflow Steps:', workflowContext.relatedWorkflow.steps ? workflowContext.relatedWorkflow.steps.length : 'no steps');
          
          const relatedFlow = workflowContext.relatedWorkflow;
          
          if (workflowContext.isImproved) {
            // 現在のフローが改善後の場合、関連フローは元のフロー
            contextInfo += `\n\n【元のフロー情報】
ID: ${relatedFlow.id || '未設定'}
名前: ${relatedFlow.name || '未設定'}
説明: ${relatedFlow.description || '未設定'}`;
          } else {
            // 現在のフローが元のフローの場合、関連フローは改善後のフロー
            contextInfo += `\n\n【改善後のフロー情報】
ID: ${relatedFlow.id || '未設定'}
名前: ${relatedFlow.name || '未設定'}
説明: ${relatedFlow.description || '未設定'}`;
          }
          
          // 関連フローのステップ情報
          if (relatedFlow.steps && relatedFlow.steps.length > 0) {
            contextInfo += `\n\n【${workflowContext.isImproved ? '元' : '改善後'}のフローのステップ情報】`;
            relatedFlow.steps.forEach((step: WorkflowStep, index: number) => {
              contextInfo += `\n${index + 1}. ${step.title || '未設定'}
   - 説明: ${step.description || '未設定'}
   - 担当: ${step.assignee || '未設定'}
   - 所要時間: ${step.timeRequired || 0}分`;
            });
          }
          console.log('Added Related Workflow Info to Context');
        } else {
          // 関連するワークフローがない場合
          if (workflowContext.isImproved && workflowContext.originalId) {
            // 改善後のワークフローの場合、元のワークフローの情報も表示
            contextInfo += `\n\n【このフローは改善後のフローです。元のフローのIDは ${workflowContext.originalId} ですが、詳細情報は利用できません。】`;
          } else if (!workflowContext.isImproved) {
            // 元のワークフローの場合
            contextInfo += `\n\n【このフローは元のフローです。改善後のフローの情報は利用できません。】`;
          }
          console.log('No Related Workflow Info');
        }
        console.log('Added Workflow Context to Context');
      } catch (error) {
        console.error('Error adding workflow context to context:', error);
      }
    } else {
      console.log('No workflow context provided');
    }

    // コンテキスト情報の確認
    console.log('Context Info:', contextInfo);
    
    // コンテキスト情報を常にユーザーメッセージに追加（空でも）
    userMessage = `${contextInfo}\n\n${message}`;

    // Claude APIの呼び出し
    const response = await anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
      temperature: 0.7,
    });

    console.log('Claude API Response:', JSON.stringify(response, null, 2));

    // レスポンスの返却
    let responseText = '';
    
    try {
      if (response.content && Array.isArray(response.content) && response.content.length > 0) {
        // 各コンテンツブロックを処理
        responseText = response.content
          .map(content => {
            if (content.type === 'text') {
              return content.text;
            } else {
              return JSON.stringify(content);
            }
          })
          .join('\n');
      } else if (response.content && !Array.isArray(response.content)) {
        if (typeof response.content === 'string') {
          responseText = response.content;
        } else {
          responseText = JSON.stringify(response.content);
        }
      }
      
      console.log('Processed Response Text:', responseText);
    } catch (error) {
      console.error('Error processing Claude API response:', error);
      responseText = 'APIレスポンスの処理中にエラーが発生しました。';
    }
    
    return NextResponse.json({
      response: responseText,
    });
  } catch (error) {
    console.error('Error calling Claude API:', error);
    return NextResponse.json(
      { error: 'Failed to call Claude API' },
      { status: 500 }
    );
  }
}
