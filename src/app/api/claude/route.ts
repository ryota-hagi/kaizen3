import { NextRequest, NextResponse } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';

// 型定義
interface Employee {
  name: string;
  position: string;
  department: string;
  hourlyRate: number;
}

interface WorkflowStep {
  title: string;
  description: string;
  assignee: string;
  timeRequired: number;
}

// Anthropic APIクライアントの初期化
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export async function POST(request: NextRequest) {
  try {
    // リクエストボディの解析
    const body = await request.json();
    console.log('API Request Body:', JSON.stringify(body, null, 2));
    
    const { message, companyInfo, employees, workflowContext } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // システムプロンプトの構築
    let systemPrompt = `あなたは業務改善AIアシスタント「Kaizen」です。
ユーザーの業務改善を支援することが役割です。
業務フローの各ステップを分析し、自動化や効率化が可能な改善案を提案してください。
特に以下の点を重視してください：
1. 自動化できるステップを特定し、担当を「自動化」に変更
2. 自動化により所要時間を短縮
3. 適切なツール/設備を提案（特に自動化の場合）
4. コスト削減効果を試算
5. 業務フロー全体の効率化

回答は必ず以下のフォーマットで各ステップごとに提供してください：
<工程名>ステップのタイトル</工程名>
<概要>ステップの説明</概要>
<担当者>担当者または「自動化」</担当者>
<所要時間>分数（数字のみ）</所要時間>
<ツール>使用するツールや設備（メール、電話、Zapier、Zoom、車、バックホー、3Dプリンタなど）</ツール>
<コスト>コスト削減額または「なし」</コスト>

各タグは必ず含めてください。特に<ツール>タグは重要です。自動化の場合は「自動化システム」などの適切なツール名を指定してください。`;

    // ユーザーメッセージの構築
    let userMessage = message;

    // コンテキスト情報の追加
    let contextInfo = '';

    // 会社情報の追加
    if (companyInfo) {
      contextInfo += `\n\n【会社情報】
会社名: ${companyInfo.name}
業種: ${companyInfo.industry}
規模: ${companyInfo.size}
所在地: ${companyInfo.address}`;
    }

    // 従業員情報の追加
    if (employees && employees.length > 0) {
      contextInfo += `\n\n【従業員情報】`;
      employees.forEach((emp: Employee) => {
        contextInfo += `\n- ${emp.name} (${emp.position}, ${emp.department}, 時給: ${emp.hourlyRate}円)`;
      });
    }

    // ワークフロー情報の追加
    if (workflowContext) {
      contextInfo += `\n\n【現在の業務フロー情報】
ID: ${workflowContext.id}
名前: ${workflowContext.name}
説明: ${workflowContext.description}
改善済み: ${workflowContext.isImproved ? 'はい' : 'いいえ'}`;

      if (workflowContext.originalId) {
        contextInfo += `\n元のフローID: ${workflowContext.originalId}`;
      }

      if (workflowContext.steps && workflowContext.steps.length > 0) {
        contextInfo += `\n\n【現在のフローのステップ情報】`;
        workflowContext.steps.forEach((step: WorkflowStep, index: number) => {
          contextInfo += `\n${index + 1}. ${step.title}
   - 説明: ${step.description}
   - 担当: ${step.assignee}
   - 所要時間: ${step.timeRequired}分`;
          
          // ツール情報があれば追加
          if ((step as any).tools) {
            contextInfo += `\n   - ツール/設備: ${(step as any).tools}`;
          }
        });
      }

      // 関連するワークフロー情報の追加
      if (workflowContext.relatedWorkflow) {
        const relatedFlow = workflowContext.relatedWorkflow;
        
        if (workflowContext.isImproved) {
          // 現在のフローが改善後の場合、関連フローは元のフロー
          contextInfo += `\n\n【元のフロー情報】
ID: ${relatedFlow.id}
名前: ${relatedFlow.name}
説明: ${relatedFlow.description}`;
        } else {
          // 現在のフローが元のフローの場合、関連フローは改善後のフロー
          contextInfo += `\n\n【改善後のフロー情報】
ID: ${relatedFlow.id}
名前: ${relatedFlow.name}
説明: ${relatedFlow.description}`;
        }
        
        // 関連フローのステップ情報
        if (relatedFlow.steps && relatedFlow.steps.length > 0) {
          contextInfo += `\n\n【${workflowContext.isImproved ? '元' : '改善後'}のフローのステップ情報】`;
          relatedFlow.steps.forEach((step: WorkflowStep, index: number) => {
            contextInfo += `\n${index + 1}. ${step.title}
   - 説明: ${step.description}
   - 担当: ${step.assignee}
   - 所要時間: ${step.timeRequired}分`;
            
            // ツール情報があれば追加
            if ((step as any).tools) {
              contextInfo += `\n   - ツール/設備: ${(step as any).tools}`;
            }
          });
        }
      } else {
        // 関連するワークフローがない場合
        if (workflowContext.isImproved && workflowContext.originalId) {
          // 改善後のワークフローの場合、元のワークフローの情報も表示
          contextInfo += `\n\n【このフローは改善後のフローです。元のフローのIDは ${workflowContext.originalId} ですが、詳細情報は利用できません。】`;
        } else if (!workflowContext.isImproved) {
          // 元のワークフローの場合
          contextInfo += `\n\n【このフローは元のフローです。改善後のフローの情報は利用できません。】`;
        }
      }
    }

    // コンテキスト情報がある場合、ユーザーメッセージに追加
    if (contextInfo) {
      userMessage = `${contextInfo}\n\n${message}`;
    }

    // Claude APIの呼び出し
    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-latest',
      max_tokens: 2000,
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
