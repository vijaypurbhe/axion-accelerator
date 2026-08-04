import { useState } from "react";
import { Paperclip } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { roleLabelFor } from "@/services/workspace";
import type { AssessmentQuestion, AssessmentResponse } from "@/domain/phase2";
import { scoreResponse } from "@/services/scoring";

export interface QuestionCardProps {
  question: AssessmentQuestion;
  response?: AssessmentResponse;
  onSave: (input: Omit<AssessmentResponse, "updatedAt" | "updatedBy">) => void;
}

/** Guided questionnaire item supporting all answer types, comments, evidence and applicability. */
export const QuestionCard = ({ question, response, onSave }: QuestionCardProps) => {
  const [comment, setComment] = useState(response?.comment ?? "");
  const [evidence, setEvidence] = useState(response?.evidenceName ?? "");
  const [text, setText] = useState(response?.text ?? "");
  const [numeric, setNumeric] = useState(response?.numeric?.toString() ?? "");

  const patch = (next: Partial<AssessmentResponse>) =>
    onSave({
      questionId: question.id,
      choice: response?.choice,
      choices: response?.choices,
      numeric: response?.numeric,
      text: response?.text,
      comment,
      evidenceName: evidence || undefined,
      notApplicable: response?.notApplicable,
      owner: question.owner,
      ...next,
    });

  const score = scoreResponse(question, response);
  const selectedChoices = response?.choices ?? [];

  return (
    <article className="rounded-xl border border-border bg-card p-4 shadow-card">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            {question.mandatory ? (
              <Badge variant="outline" className="border-brand/40 bg-brand/5 text-[10px] text-brand">
                Mandatory
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                Optional
              </Badge>
            )}
            {question.applicability !== "all" ? (
              <Badge variant="outline" className="text-[10px] uppercase text-muted-foreground">
                {question.applicability}
              </Badge>
            ) : null}
            <span className="text-[11px] text-muted-foreground">Weight {question.weight.toFixed(1)}</span>
            <span className="text-[11px] capitalize text-muted-foreground">
              Owner: {roleLabelFor(question.owner)}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-foreground">{question.prompt}</h3>
          {question.guidance ? <p className="text-xs text-muted-foreground">{question.guidance}</p> : null}
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Score</p>
          <p className="text-lg font-semibold tabular-nums text-foreground">{score === null ? "—" : score}</p>
        </div>
      </header>

      <div className="mt-3 space-y-3">
        {question.type === "single" ? (
          <RadioGroup
            value={response?.choice ?? ""}
            onValueChange={(value) => patch({ choice: value, notApplicable: false })}
            className="gap-2"
          >
            {question.options?.map((option) => (
              <div key={option.value} className="flex items-center gap-2">
                <RadioGroupItem value={option.value} id={`${question.id}-${option.value}`} />
                <Label htmlFor={`${question.id}-${option.value}`} className="text-xs font-normal">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        ) : null}

        {question.type === "multi" ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {question.options?.map((option) => {
              const checked = selectedChoices.includes(option.value);
              return (
                <div key={option.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`${question.id}-${option.value}`}
                    checked={checked}
                    onCheckedChange={(value) =>
                      patch({
                        choices: value
                          ? [...selectedChoices, option.value]
                          : selectedChoices.filter((entry) => entry !== option.value),
                        notApplicable: false,
                      })
                    }
                  />
                  <Label htmlFor={`${question.id}-${option.value}`} className="text-xs font-normal">
                    {option.label}
                  </Label>
                </div>
              );
            })}
          </div>
        ) : null}

        {question.type === "numeric" ? (
          <div className="flex items-end gap-2">
            <div className="w-40 space-y-1">
              <Label className="text-xs">Value (max {question.max ?? 100})</Label>
              <Input
                type="number"
                value={numeric}
                onChange={(event) => setNumeric(event.target.value)}
                max={question.max ?? 100}
                min={0}
              />
            </div>
            <Button size="sm" variant="outline" onClick={() => patch({ numeric: Number(numeric), notApplicable: false })}>
              Save value
            </Button>
          </div>
        ) : null}

        {question.type === "text" ? (
          <div className="space-y-2">
            <Textarea rows={3} value={text} onChange={(event) => setText(event.target.value)} />
            <Button size="sm" variant="outline" onClick={() => patch({ text, notApplicable: false })}>
              Save response
            </Button>
          </div>
        ) : null}

        <div className="grid gap-3 border-t border-border pt-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">Comment</Label>
            <Textarea
              rows={2}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              onBlur={() => patch({ comment })}
              placeholder="Context, caveats or follow-up actions"
            />
          </div>
          <div className="space-y-1">
            <Label className="flex items-center gap-1.5 text-xs">
              <Paperclip className="h-3 w-3" aria-hidden /> Evidence
              {question.evidenceRequired ? <span className="text-brand">required</span> : null}
            </Label>
            <Input
              value={evidence}
              onChange={(event) => setEvidence(event.target.value)}
              onBlur={() => patch({ evidenceName: evidence || undefined })}
              placeholder="e.g. DQ_Profile_Report.pdf"
            />
            <p className="text-[10px] text-muted-foreground">
              Attachment upload is a placeholder in this release — record the artefact name.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-3">
          <div className="flex items-center gap-2">
            <Switch
              id={`${question.id}-na`}
              checked={Boolean(response?.notApplicable)}
              onCheckedChange={(value) => patch({ notApplicable: value })}
            />
            <Label htmlFor={`${question.id}-na`} className="text-xs font-normal">
              Not applicable to this engagement
            </Label>
          </div>
          {response ? (
            <p className="text-[10px] text-muted-foreground">
              Last updated {new Date(response.updatedAt).toLocaleString()} by {response.updatedBy}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
};

export default QuestionCard;
